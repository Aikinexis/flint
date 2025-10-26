import logo from '../assets/FLINT_LOGO.svg';

/**
 * Toolbar component with logo and title
 */
export function Toolbar() {
  return (
    <div className="flint-toolbar">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Flint" style={{ width: '24px', height: '24px' }} />
        <span className="text-lg font-semibold">Flint</span>
      </div>
    </div>
  );
}
