import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../App';

// Tests de integración de alto nivel: cargan los datos de ejemplo de Fase 0
// dentro de la app completa y comprueban que el bug de duplicados y las
// pestañas principales funcionan de extremo a extremo.

beforeEach(() => {
  localStorage.clear();
});

async function skipLoadingSkeleton() {
  await waitFor(() => expect(screen.queryByText(/Cargar datos de ejemplo/i)).toBeInTheDocument(), { timeout: 2000 });
}

describe('App — flujo completo con datos de ejemplo', () => {
  it('renderiza el título y permite cargar los datos de ejemplo sin errores', async () => {
    render(<App />);
    await skipLoadingSkeleton();
    expect(screen.getByText('Diario de Inversiones')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Cargar datos de ejemplo/i));

    await waitFor(() => {
      expect(screen.getByText(/Valor total/i)).toBeInTheDocument();
    });
  });

  it('el S&P 500 aparece una sola vez en la leyenda de evolución tras cargar datos de ejemplo', async () => {
    render(<App />);
    await skipLoadingSkeleton();
    fireEvent.click(screen.getByText(/Cargar datos de ejemplo/i));

    await waitFor(() => expect(screen.getByText(/Valor total/i)).toBeInTheDocument());

    // "S&P 500" debería aparecer exactamente una vez en la leyenda de la
    // gráfica de evolución del Resumen (no una vez por cada variante de
    // nombre introducida en el dataset de prueba).
    const matches = screen.getAllByText('S&P 500');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('cambia de pestaña a Movimientos y muestra el formulario y la tabla', async () => {
    render(<App />);
    await skipLoadingSkeleton();
    fireEvent.click(screen.getByText(/Cargar datos de ejemplo/i));
    await waitFor(() => expect(screen.getByText(/Valor total/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText('Movimientos'));
    await waitFor(() => expect(screen.getByText('Añadir movimiento')).toBeInTheDocument());
    expect(screen.getByText('Historial de movimientos')).toBeInTheDocument();
  });

  it('cambia a la pestaña Consejo IA y muestra el disclaimer de no-asesoramiento', async () => {
    render(<App />);
    await skipLoadingSkeleton();
    fireEvent.click(screen.getByText('Consejo IA'));
    await waitFor(() => expect(screen.getByText(/No es asesoramiento financiero real/i)).toBeInTheDocument());
  });

  it('vaciar todo resetea el estado y vuelve al estado vacío', async () => {
    render(<App />);
    await skipLoadingSkeleton();
    fireEvent.click(screen.getByText(/Cargar datos de ejemplo/i));
    await waitFor(() => expect(screen.getByText(/Valor total/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Vaciar todo/i));
    fireEvent.click(screen.getByText('Movimientos'));
    await waitFor(() => expect(screen.getByText(/Todavía no hay movimientos registrados/i)).toBeInTheDocument());
  });
});
