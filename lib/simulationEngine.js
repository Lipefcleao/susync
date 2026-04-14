/**
 * Motor de Simulação de Comportamento Realista (Cenários)
 * Focado em fornecer funções determinísticas que retornam objetos de ausências
 * graduais para testar as capacidades do RiskEngine no Dashboard.
 */

// Função Helper: Mapeia todos os plantões disponíveis (sem faltas) agrupados por profissional
function getAvailableShiftsByWorker(shifts, absences) {
  const map = {};
  shifts.forEach(s => {
    const hasAbsence = absences.some(a => a.shiftId === s.id);
    if (!hasAbsence) {
      if (!map[s.professionalId]) map[s.professionalId] = [];
      map[s.professionalId].push(s);
    }
  });
  return map;
}

/**
 * 1. Simulação Nível Leve (Baixo Impacto)
 * Adiciona UMA ausência apenas, preferencialmente mais antiga ou isolada,
 * que resultará num cálculo de risco inofensivo.
 */
export function simulateLightAbsence(database, simulationDate) {
  const map = getAvailableShiftsByWorker(database.shifts, database.absences);
  const candidates = Object.entries(map).filter(([pid, workerShifts]) => workerShifts.length >= 1);
  
  if (candidates.length === 0) return [];

  // Pega um candidato aleatório para variar o painel
  const index = Math.floor(Math.random() * candidates.length);
  const [targetId, workerShifts] = candidates[index];
  
  // Ordena para pegar o plantão mais distante/antigo (diminui as chances de bater regra dos 7 dias)
  const sortedShifts = workerShifts.sort((a,b) => new Date(a.date) - new Date(b.date));
  const targetShift = sortedShifts[0];

  return [{
    id: `sim_light_${Date.now()}`,
    shiftId: targetShift.id,
    professionalId: targetId,
    reason: "Atraso simples isolado",
    status: "Justificado",
    // Data retroativa baseada no dia do plantão sorteado
    reportedOn: new Date(targetShift.date).toISOString() 
  }];
}

/**
 * 2. Simulação Padrão de Início de Crise (Médio Impacto)
 * Injeta duas ausências para um mesmo profissional, engatilhando regras 
 * de multiplicidade e aumentando gradativamente o AlertEngine.
 */
export function simulatePatternAbsence(database, simulationDate) {
  const map = getAvailableShiftsByWorker(database.shifts, database.absences);
  
  // Exige profissionais com pelo menos 2 plantões ainda "saudáveis"
  const candidates = Object.entries(map).filter(([pid, workerShifts]) => workerShifts.length >= 2);
  
  if (candidates.length === 0) return [];
  
  const index = Math.floor(Math.random() * candidates.length);
  const [targetId, workerShifts] = candidates[index];
  
  // Pegamos aleatoriamente dois turnos desse profissional
  const shift1 = workerShifts[0];
  const shift2 = workerShifts[1];
  
  return [
    {
      id: `sim_pat1_${Date.now()}`,
      shiftId: shift1.id,
      professionalId: targetId,
      reason: "Problema particular reiterado",
      status: "Em Análise",
      reportedOn: new Date(shift1.date).toISOString()
    },
    {
      id: `sim_pat2_${Date.now()}`,
      shiftId: shift2.id,
      professionalId: targetId,
      reason: "Extensão problema particular",
      status: "Em Análise",
      reportedOn: new Date(shift2.date).toISOString()
    }
  ];
}

/**
 * 3. Simulação de Caso Crítico / Evasão Severa (Alto Impacto)
 * Foca em engatilhar três ou mais faltas seguidas, mirando em "Alertas P1 Alto",
 * preferencialmente simulando noites de ausências em sequências curtas para forçar repetição de turnos.
 */
export function simulateCriticalCase(database, simulationDate) {
  const map = getAvailableShiftsByWorker(database.shifts, database.absences);
  
  // Verifica candidatos ideais (com 3 ou mais plantões mapeados futuros ou recentes)
  const candidates = Object.entries(map).filter(([pid, workerShifts]) => workerShifts.length >= 3);
  
  if (candidates.length === 0) return [];
  
  const index = Math.floor(Math.random() * candidates.length);
  const [targetId, workerShifts] = candidates[index];
  
  // Organiza pelos turnos da Noite primeiro (Rule 4: night shifts gives +15pts)
  // ou agrupa cronologicamente para bater nos Rules de "Dias Seguidos"
  const sortedShifts = workerShifts.sort((a,b) => {
    if (a.shift === 'Noite' && b.shift !== 'Noite') return -1;
    if (b.shift === 'Noite' && a.shift !== 'Noite') return 1;
    return new Date(b.date) - new Date(a.date); // Mais recentes primeiro
  });
  
  // Força uma simulação de 3 faltas simultâneas agendadas
  const selectedShifts = sortedShifts.slice(0, 3);
  
  return selectedShifts.map((s, idx) => ({
    id: `sim_crit_${idx}_${Date.now()}`,
    shiftId: s.id,
    professionalId: targetId,
    reason: "Esgotamento / Absenteísmo Crônico",
    status: "Alerta Operacional Ativo",
    // Baseado na data estrita da escala respectiva
    reportedOn: new Date(s.date).toISOString()
  }));
}
