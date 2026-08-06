import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeatmapMensual from '../components/HeatmapMensual';
import KpiCard from '../components/KpiCard';
import VistaPorTipo from '../components/VistaPorTipo';
import { createAsset } from '../lib/models';

// Cobertura de componentes que hasta ahora solo se ejercitaban de forma
// indirecta a través de App.test.jsx (sesión de madrugada 2026-08-07): no
// son regresiones de bugs concretos, sino tests de comportamiento base para
// que futuras sesiones detecten roturas antes en estos componentes.

describe('HeatmapMensual', () => {
  it('muestra "—" en el primer mes (sin mes anterior con el que comparar) y el signo correcto después', () => {
    const asset = createAsset({ nombre: 'S&P 500', categoria: 'Fondos indexados' });
    const entries = [
      { id: 'e1', assetId: asset.id, mes: '2026-01', valor: 1000, aportacion: 1000 },
      { id: 'e2', assetId: asset.id, mes: '2026-02', valor: 900, aportacion: 0 }, // baja un 10%
      { id: 'e3', assetId: asset.id, mes: '2026-03', valor: 990, aportacion: 0 }, // sube un 10%
    ];
    render(<HeatmapMensual assets={[asset]} entries={entries} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('-10.0%')).toBeInTheDocument();
    expect(screen.getByText('+10.0%')).toBeInTheDocument();
  });

  it('sin datos muestra el estado vacío', () => {
    render(<HeatmapMensual assets={[]} entries={[]} />);
    expect(screen.getByText('Sin datos para mostrar.')).toBeInTheDocument();
  });
});

describe('KpiCard', () => {
  it('muestra la fórmula en foco/hover y la oculta al perder el foco (accesible por teclado)', () => {
    render(<KpiCard label="CAGR" value="12,3%" formula="CAGR = ..." />);
    const boton = screen.getByRole('button', { name: /Cómo se calcula CAGR/i });
    expect(screen.queryByText('CAGR = ...')).not.toBeInTheDocument();
    fireEvent.focus(boton);
    expect(screen.getByText('CAGR = ...')).toBeInTheDocument();
    fireEvent.blur(boton);
    expect(screen.queryByText('CAGR = ...')).not.toBeInTheDocument();
  });

  it('no renderiza el botón de fórmula si no se pasa `formula`', () => {
    render(<KpiCard label="Valor total" value="1.000 €" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('VistaPorTipo — filtra activos por grupo de categoría', () => {
  it('el grupo "Cripto" excluye activos de otras categorías', () => {
    const fondo = createAsset({ nombre: 'S&P 500', categoria: 'Fondos indexados' });
    const cripto = createAsset({ nombre: 'Bitcoin', categoria: 'Cripto' });
    const entries = [
      { id: 'e1', assetId: fondo.id, mes: '2026-01', valor: 1000, aportacion: 1000 },
      { id: 'e2', assetId: cripto.id, mes: '2026-01', valor: 500, aportacion: 500 },
    ];
    render(<VistaPorTipo assets={[fondo, cripto]} entries={entries} onAssetClick={vi.fn()} />);

    // Por defecto ("Todo junto") cuenta los dos activos.
    expect(screen.getByText(/2 activo\(s\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Cripto' }));
    expect(screen.getByText(/1 activo\(s\)/)).toBeInTheDocument();
  });
});
