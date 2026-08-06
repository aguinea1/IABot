import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AsesorIA from '../components/AsesorIA';
import DuplicadosPanel from '../components/DuplicadosPanel';
import PanelDetalleActivo from '../components/PanelDetalleActivo';
import { CATEGORIAS, createAsset } from '../lib/models';

// Regresión de bugs corregidos en la revisión de calidad del 2026-08-05:
// ver PROGRESS.md / README.md, sección "Revisión de calidad adicional".

describe('AsesorIA — selector de categoría', () => {
  it('ofrece todas las categorías del modelo de datos, incluida "Cuenta remunerada"', () => {
    render(<AsesorIA assets={[]} />);
    const select = screen.getByLabelText(/categoría/i);
    const opciones = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(opciones).toEqual(CATEGORIAS);
    expect(opciones).toContain('Cuenta remunerada');
  });
});

describe('DuplicadosPanel — fusión de grupos con más de 2 duplicados', () => {
  it('fusiona todo el grupo (no solo los dos primeros) en un único click', () => {
    const a = createAsset({ nombre: 'S&P 500', categoria: 'Fondos indexados' });
    const b = createAsset({ nombre: 's&p500 ', categoria: 'Fondos indexados' });
    const c = createAsset({ nombre: 'SP500', categoria: 'Fondos indexados' });
    const onMerge = vi.fn();

    render(<DuplicadosPanel duplicates={[[a, b, c]]} onMerge={onMerge} />);
    screen.getByRole('button', { name: /Fusionar en/i }).click();

    expect(onMerge).toHaveBeenCalledTimes(2);
    expect(onMerge).toHaveBeenCalledWith(a.id, b.id);
    expect(onMerge).toHaveBeenCalledWith(a.id, c.id);
  });

  it('no renderiza nada si no hay duplicados', () => {
    const { container } = render(<DuplicadosPanel duplicates={[]} onMerge={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// Regresión de bug corregido en la revisión de calidad del 2026-08-06: ver
// PROGRESS.md, sesión 2026-08-06.
describe('PanelDetalleActivo — no roba el foco en cada re-render', () => {
  it('no vuelve a mover el foco al botón de cerrar si solo cambia la identidad de onClose', () => {
    const asset = createAsset({ nombre: 'S&P 500', categoria: 'Fondos indexados' });
    const assets = [asset];
    const entries = [{ id: 'e1', assetId: asset.id, mes: '2026-01', valor: 100, aportacion: 100 }];

    const input = document.createElement('input');
    document.body.appendChild(input);

    const { rerender } = render(
      <PanelDetalleActivo assetId={asset.id} assets={assets} entries={entries} onClose={() => {}} />
    );

    // El usuario hace foco en otro elemento de la página (simulando que
    // está escribiendo en un formulario mientras el panel sigue abierto).
    input.focus();
    expect(document.activeElement).toBe(input);

    // Re-render con el MISMO assetId pero una nueva identidad de onClose
    // (esto es justo lo que pasaba en App.jsx en cada render: onClose se
    // creaba como arrow function inline). Antes del fix, esto disparaba de
    // nuevo el efecto de foco y robaba el foco de vuelta al botón de cerrar.
    rerender(
      <PanelDetalleActivo assetId={asset.id} assets={assets} entries={entries} onClose={() => {}} />
    );

    expect(document.activeElement).toBe(input);

    document.body.removeChild(input);
  });
});
