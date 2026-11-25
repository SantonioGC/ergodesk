const { evaluarTarjeta } = require('../payment-sandbox');
const { calcularConfiguracion } = require('../configurador');

describe('sandbox de pagos local', () => {
  const tarjetaBase = { titular: 'USUARIO DE PRUEBA', vencimiento: '12/99', cvc: '123' };

  test('la tarjeta de prueba aprobada produce un resultado aprobado', () => {
    const r = evaluarTarjeta({ ...tarjetaBase, numero: '4242424242424242' });
    expect(r.resultado).toBe('aprobado');
    expect(r.ultimos4).toBe('4242');
    expect(r).not.toHaveProperty('numero');
    expect(r).not.toHaveProperty('cvc');
  });

  test('la tarjeta de prueba rechazada no se marca como aprobada', () => {
    const r = evaluarTarjeta({ ...tarjetaBase, numero: '4000000000000002' });
    expect(r.resultado).toBe('rechazado');
  });

  test('la tarjeta de prueba de fondos insuficientes se rechaza', () => {
    const r = evaluarTarjeta({ ...tarjetaBase, numero: '4000000000009995' });
    expect(r.resultado).toBe('rechazado');
    expect(r.descripcion).toMatch(/insuficientes/i);
  });

  test('rechaza un número que no sea tarjeta de prueba admitida', () => {
    expect(() => evaluarTarjeta({ ...tarjetaBase, numero: '4111111111111111' }))
      .toThrow(/tarjeta de prueba/i);
  });

  test('rechaza formato de vencimiento y CVC incorrectos', () => {
    expect(() => evaluarTarjeta({ ...tarjetaBase, numero: '4242424242424242', vencimiento: '2029-12' }))
      .toThrow(/MM\/AA/i);
    expect(() => evaluarTarjeta({ ...tarjetaBase, numero: '4242424242424242', cvc: '1' }))
      .toThrow(/CVC/i);
  });
});

describe('precios del configurador en servidor', () => {
  test('calcula el importe con los identificadores de las opciones', () => {
    const r = calcularConfiguracion({
      tamano_valor: 120,
      patas_valor: 'ajustables_manual',
      acabado_valor: 'roble',
      accesorios_valores: ['bandeja_cables']
    });
    expect(r.precio).toBe(5949);
    expect(r.configuracion.acabado).toBe('Roble');
  });

  test('rechaza accesorios duplicados o inventados', () => {
    expect(() => calcularConfiguracion({
      tamano_valor: 100,
      patas_valor: 'fijas',
      acabado_valor: 'negro',
      accesorios_valores: ['bandeja_cables', 'bandeja_cables']
    })).toThrow(/inválidos o repetidos/i);
  });
});
