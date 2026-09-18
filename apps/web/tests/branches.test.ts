/**
 * Pruebas del dominio de sucursales (V3.0).
 *
 * Corren con el ejecutor nativo de Node (`node --test`), sin dependencias: el
 * dominio es TypeScript puro sin imports de valores, y Node 24 elimina los
 * tipos al cargarlo. Lo que se prueba aquí es lo que decide la pantalla; lo
 * que decide los datos se prueba contra la base con sesión simulada (§9.2).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ETIQUETA_SIN_SUCURSAL,
  coordenadasDeEnlaceDeMaps,
  enlaceDelLugarDeMaps,
  esEnlaceCortoDeMaps,
  esHostDeGoogleMaps,
  lugarDeEnlaceDeMaps,
  lineasDeHorario,
  repartoPorSucursal,
  resolverSucursalOperativa,
  sugerirCodigo,
  urlDeMapaEmbebido,
  urlDeUbicacion,
  validarSucursal,
  type FormularioDeSucursal,
  type SucursalOperable,
} from '../src/core/domain/operations/branches.ts';

function sede(parcial: Partial<SucursalOperable> & Pick<SucursalOperable, 'id' | 'name'>): SucursalOperable {
  return {
    code: parcial.name.toUpperCase(),
    address: null,
    isPrimary: false,
    isActive: true,
    puedeOperar: true,
    asignada: false,
    ...parcial,
  };
}

const PRADO = sede({ id: 'p', name: 'Prado', isPrimary: true });
const MIRAFLORES = sede({ id: 'm', name: 'Miraflores' });

describe('resolverSucursalOperativa', () => {
  it('respeta la sede elegida si todavía puede operar en ella', () => {
    assert.equal(resolverSucursalOperativa([PRADO, MIRAFLORES], 'm')?.id, 'm');
  });

  it('ignora una preferencia (cookie) hacia una sede donde ya no puede operar', () => {
    const sinAcceso = { ...MIRAFLORES, puedeOperar: false };
    assert.equal(resolverSucursalOperativa([PRADO, sinAcceso], 'm')?.id, 'p');
  });

  it('ignora una preferencia hacia una sede desactivada', () => {
    const cerrada = { ...MIRAFLORES, isActive: false };
    assert.equal(resolverSucursalOperativa([PRADO, cerrada], 'm')?.id, 'p');
  });

  it('ignora una preferencia inventada (id de otro gimnasio)', () => {
    assert.equal(resolverSucursalOperativa([PRADO, MIRAFLORES], 'sede-ajena')?.id, 'p');
  });

  it('sin preferencia usa la principal', () => {
    assert.equal(resolverSucursalOperativa([MIRAFLORES, PRADO], null)?.id, 'p');
  });

  it('sin principal operable usa la primera por nombre', () => {
    const soloAsignado = [{ ...PRADO, puedeOperar: false }, sede({ id: 'z', name: 'Zona Sur' }), MIRAFLORES];
    assert.equal(resolverSucursalOperativa(soloAsignado, undefined)?.id, 'm');
  });

  it('sin ninguna sede operable no devuelve nada (falla cerrado)', () => {
    assert.equal(resolverSucursalOperativa([{ ...PRADO, puedeOperar: false }], 'p'), null);
    assert.equal(resolverSucursalOperativa([], null), null);
  });
});

const VALIDO: FormularioDeSucursal = {
  code: 'miraflores',
  name: '  Miraflores ',
  address: 'Av. Argentina 1843',
  phone: '',
  email: '',
  openingHours: '',
  latitude: '',
  longitude: '',
  googleMapsUrl: 'https://maps.app.goo.gl/CU6shAKUoYGLpjED7',
};

describe('validarSucursal', () => {
  it('normaliza código a mayúsculas, recorta y vacía lo opcional', () => {
    const r = validarSucursal(VALIDO);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.datos.code, 'MIRAFLORES');
    assert.equal(r.datos.name, 'Miraflores');
    assert.equal(r.datos.phone, null);
    assert.equal(r.datos.latitude, null);
  });

  it('rechaza códigos con espacios, símbolos o de un solo carácter', () => {
    for (const code of ['A', 'TORRE VICENTA', 'PRA-DO', 'ABCDEFGHIJKLM']) {
      const r = validarSucursal({ ...VALIDO, code });
      assert.equal(r.ok, false, code);
      if (!r.ok) assert.ok(r.errores.code);
    }
  });

  it('exige latitud y longitud juntas y dentro de rango', () => {
    const sola = validarSucursal({ ...VALIDO, latitude: '-16.5' });
    assert.equal(sola.ok, false);
    const fuera = validarSucursal({ ...VALIDO, latitude: '-96', longitude: '-68.1' });
    assert.equal(fuera.ok, false);
    const coma = validarSucursal({ ...VALIDO, latitude: '-16,503826', longitude: '-68,131221' });
    assert.equal(coma.ok, true);
    if (coma.ok) assert.equal(coma.datos.latitude, -16.503826);
  });

  it('solo acepta enlaces de Google Maps (el valor termina en un href público)', () => {
    assert.equal(validarSucursal({ ...VALIDO, googleMapsUrl: 'https://evil.example/maps' }).ok, false);
    assert.equal(validarSucursal({ ...VALIDO, googleMapsUrl: 'javascript:alert(1)' }).ok, false);
    assert.equal(validarSucursal({ ...VALIDO, googleMapsUrl: 'https://maps.google.com/?cid=5209852825009402175' }).ok, true);
    assert.equal(validarSucursal({ ...VALIDO, googleMapsUrl: 'https://www.google.com/maps/place/x' }).ok, true);
  });

  it('valida el correo y el teléfono', () => {
    assert.equal(validarSucursal({ ...VALIDO, email: 'sede@' }).ok, false);
    assert.equal(validarSucursal({ ...VALIDO, phone: 'llamar' }).ok, false);
    assert.equal(validarSucursal({ ...VALIDO, email: 'Prado@Mitico.com', phone: '+591 777 00867' }).ok, true);
  });
});

describe('repartoPorSucursal', () => {
  it('cuenta por sede y deja el histórico sin sede al final', () => {
    const reparto = repartoPorSucursal([
      { branchId: null, branchName: null },
      { branchId: 'p', branchName: 'Prado' },
      { branchId: 'm', branchName: 'Miraflores' },
      { branchId: 'm', branchName: 'Miraflores' },
      { branchId: null, branchName: null },
      { branchId: null, branchName: null },
    ]);
    assert.deepEqual(
      reparto.map((r) => [r.nombre, r.visitas]),
      [
        ['Miraflores', 2],
        ['Prado', 1],
        [ETIQUETA_SIN_SUCURSAL, 3],
      ],
    );
  });
});

describe('ubicación', () => {
  it('el enlace del negocio manda sobre las coordenadas', () => {
    const url = urlDeUbicacion({ googleMapsUrl: 'https://maps.app.goo.gl/x', latitude: -16.5, longitude: -68.1, address: 'A' });
    assert.equal(url, 'https://maps.app.goo.gl/x');
  });

  it('el mapa embebido usa coordenadas y, sin ellas, la dirección (el enlace corto no se puede incrustar)', () => {
    assert.match(urlDeMapaEmbebido({ latitude: -16.503826, longitude: -68.131221, address: null, name: 'Prado' }) ?? '', /q=-16\.503826,-68\.131221/);
    assert.match(urlDeMapaEmbebido({ latitude: null, longitude: null, address: 'Av. Argentina 1843', name: 'M' }, 'La Paz') ?? '', /q=Av\.%20Argentina%201843%2C%20La%20Paz/);
    assert.equal(urlDeMapaEmbebido({ latitude: null, longitude: null, address: null, name: 'M' }), null);
    // No repite la ciudad si la dirección ya la trae.
    assert.match(urlDeMapaEmbebido({ latitude: null, longitude: null, address: 'Av. Argentina 1843, La Paz', name: 'M' }, 'La Paz') ?? '', /1843%2C%20La%20Paz&/);
  });
});

describe('mapa desde el enlace de Google Maps (V4.2)', () => {
  it('lee el marcador del lugar antes que el centro de la vista', () => {
    const url = 'https://www.google.com/maps/place/Gym/@-16.5100000,-68.1200000,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x1!8m2!3d-16.5019648!4d-68.1476096';
    assert.deepEqual(coordenadasDeEnlaceDeMaps(url), { latitude: -16.5019648, longitude: -68.1476096 });
  });

  it('lee el centro de la vista y las consultas con coordenadas', () => {
    assert.deepEqual(coordenadasDeEnlaceDeMaps('https://www.google.com/maps/@-16.4955,-68.1336,15z'), { latitude: -16.4955, longitude: -68.1336 });
    assert.deepEqual(coordenadasDeEnlaceDeMaps('https://maps.google.com/?q=-16.5,-68.15'), { latitude: -16.5, longitude: -68.15 });
    assert.deepEqual(coordenadasDeEnlaceDeMaps('https://www.google.com/maps/search/?api=1&query=-16.5%2C-68.15'), { latitude: -16.5, longitude: -68.15 });
    assert.deepEqual(coordenadasDeEnlaceDeMaps('https://maps.google.com/maps?ll=-16.5,-68.15&z=16'), { latitude: -16.5, longitude: -68.15 });
  });

  it('no inventa coordenadas: enlace corto, cid, texto o valores fuera de rango', () => {
    assert.equal(coordenadasDeEnlaceDeMaps('https://maps.app.goo.gl/CU6shAKUoYGLpjED7'), null);
    assert.equal(coordenadasDeEnlaceDeMaps('https://maps.google.com/?cid=5209852825009402175'), null);
    assert.equal(coordenadasDeEnlaceDeMaps('https://maps.google.com/?q=Av.+Apumalla+422'), null);
    assert.equal(coordenadasDeEnlaceDeMaps('https://www.google.com/maps/@95.1,-68.1,15z'), null);
  });

  it('del enlace corto resuelto guarda el lugar sin la consulta de seguimiento', () => {
    const resuelto = 'https://www.google.com/maps/place/Edificio+Torre+Vicenta,+La+Paz/data=!4m2!3m1!1s0x915f:0x7a75!18m1!1e1?utm_source=mstt_1&entry=gps&g_ep=CAESBzI2';
    assert.equal(enlaceDelLugarDeMaps(resuelto), 'https://www.google.com/maps/place/Edificio+Torre+Vicenta,+La+Paz/data=!4m2!3m1!1s0x915f:0x7a75!18m1!1e1');
    assert.equal(enlaceDelLugarDeMaps('https://www.google.com/maps?cid=5209852825009402175'), null);
    assert.equal(enlaceDelLugarDeMaps('https://evil.example/maps/place/X/'), null);
  });

  it('solo sigue enlaces de Google (el servidor no pide a cualquier sitio)', () => {
    for (const host of ['maps.app.goo.gl', 'goo.gl', 'www.google.com', 'google.com.bo', 'maps.google.com', 'consent.google.com']) {
      assert.equal(esHostDeGoogleMaps(host), true, host);
    }
    for (const host of ['evil.com', 'google.com.evil.com', 'maps.google.com.attacker.io', '169.254.169.254', 'localhost', 'mygoogle.com']) {
      assert.equal(esHostDeGoogleMaps(host), false, host);
    }
    assert.equal(esEnlaceCortoDeMaps('https://maps.app.goo.gl/abc'), true);
    assert.equal(esEnlaceCortoDeMaps('https://www.google.com/maps/place/x'), false);
  });

  it('el mapa embebido usa las coordenadas del enlace largo y, si no hay, el nombre del lugar', () => {
    const conMarcador = urlDeMapaEmbebido({ latitude: null, longitude: null, address: 'Av. X', name: 'S', googleMapsUrl: 'https://www.google.com/maps/place/S/data=!3d-16.5!4d-68.1' });
    assert.match(conMarcador ?? '', /q=-16\.5,-68\.1&/);
    const soloLugar = urlDeMapaEmbebido({ latitude: null, longitude: null, address: null, name: 'S', googleMapsUrl: 'https://www.google.com/maps/place/Edificio+Torre+Vicenta,+La+Paz/data=!4m2' });
    assert.match(soloLugar ?? '', /q=Edificio%20Torre%20Vicenta%2C%20La%20Paz&/);
    // El enlace corto no aporta nada al embebido: sin coordenadas ni dirección, no hay mapa.
    assert.equal(urlDeMapaEmbebido({ latitude: null, longitude: null, address: null, name: 'S', googleMapsUrl: 'https://maps.app.goo.gl/x' }), null);
    assert.equal(lugarDeEnlaceDeMaps('https://maps.app.goo.gl/x'), null);
  });
});

describe('utilidades', () => {
  it('sugiere códigos sin tildes ni espacios', () => {
    assert.equal(sugerirCodigo('Torre Vicenta'), 'TORREVICENTA');
    assert.equal(sugerirCodigo('Zona Sur — Calacoto'), 'ZONASURCALAC');
  });

  it('parte el horario en líneas no vacías', () => {
    assert.deepEqual(lineasDeHorario('Lun a Vie 05:30-23:00\n\n  Sáb 07:00-20:00 \r\n'), ['Lun a Vie 05:30-23:00', 'Sáb 07:00-20:00']);
    assert.deepEqual(lineasDeHorario(null), []);
  });
});
