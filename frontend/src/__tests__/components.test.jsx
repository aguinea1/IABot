import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AsesorIA from '../components/AsesorIA';
import DuplicadosPanel from '../components/DuplicadosPanel';
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
