import data from '../data/mock.json';

export function obterEscalas() {
  return data.escalas;
}

export function obterFaltas() {
  return data.escalas.filter(escala => escala.status === 'Ausente');
}

export function obterEstatisticas() {
  return data.estatisticas;
}
