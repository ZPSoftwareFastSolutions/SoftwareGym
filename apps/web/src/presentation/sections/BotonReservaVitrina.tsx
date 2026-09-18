import { Icon } from '@/presentation/icons/Icon';
import { LinkButton } from '@/presentation/ui/Button';

interface BotonReservaVitrinaProps {
  readonly slug: string;
}

export function BotonReservaVitrina({ slug }: BotonReservaVitrinaProps) {
  return (
    <div className="mt-8 flex justify-center sm:justify-start">
      <LinkButton 
        href={`/${slug}/panel/socio`} 
        variant="primary" 
        size="lg" 
        icon="calendar" 
        className="shadow-lg shadow-[var(--t-action)]/20 animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        Reservar una clase
      </LinkButton>
    </div>
  );
}
