// [PASSO 5] Motor de Cálculo de Risco de Absenteísmo (Atualizado)
// Configuração matemática de escoamento progressivo (Evitando saturação aguda do nível High)
// Todas as 5 REGRAS DE NEGÓCIO preditivas estão codificadas abaixo.

export function calculateRisk(professionalId, data, currentDate = new Date()) {
  const { professionals = [], shifts = [], absences = [] } = data;
  
  let score = 0;
  const breakdown = [];

  // Pega apenas as escalas e ausências do profissional alvo
  const myShifts = shifts.filter(s => s.professionalId === professionalId);
  const myAbsences = absences.filter(a => a.professionalId === professionalId);

  // Considerar datas reais dinâmicas garantindo viabilidade determinística
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  // Prepara matrizes de checagem
  const absencesWithDetails = myAbsences.map(absence => {
    const relatedShift = shifts.find(s => s.id === absence.shiftId);
    return {
      ...absence,
      dateObject: relatedShift ? new Date(relatedShift.date) : new Date(absence.reportedOn),
      shiftType: relatedShift ? relatedShift.shift : null 
    };
  });

  const absencesLast30Days = absencesWithDetails.filter(a => a.dateObject >= thirtyDaysAgo);
  const absencesLast7Days = absencesWithDetails.filter(a => a.dateObject >= sevenDaysAgo);

  const futureShifts = myShifts.filter(s => {
    const sDate = new Date(s.date);
    return sDate >= today;
  });

  // ----------------------------------------------------
  // REGRA 1: Se profissional tiver 2 ou mais faltas nos últimos 30 dias → +15 pontos
  // ----------------------------------------------------
  if (absencesLast30Days.length >= 2) {
    score += 15;
    breakdown.push("Histórico reincidente: 2 ou mais faltas nos últimos 30 dias (+15 pt)");
  }

  // ----------------------------------------------------
  // REGRA 2: Se tiver falta no mesmo tipo de turno recentemente → +10 pontos
  // ----------------------------------------------------
  let rule2Applied = false;
  const missedShiftTypes = new Set(absencesLast30Days.map(a => a.shiftType).filter(Boolean));
  const shiftsToEvaluate = futureShifts.length > 0 ? futureShifts : myShifts;

  for (const shift of shiftsToEvaluate) {
    if (missedShiftTypes.has(shift.shift)) {
        if (!rule2Applied) {
          score += 10;
          breakdown.push(`Risco de Padrão: Escalado em turno (${shift.shift}) no qual registrou falta recentemente (+10 pt)`);
          rule2Applied = true;
        }
    }
  }

  // ----------------------------------------------------
  // REGRA 3: Se tiver 3 ou mais plantões consecutivos → +10 pontos
  // ----------------------------------------------------
  let rule3Applied = false;
  const distinctDates = [...new Set(myShifts.map(s => s.date))].sort();
  for (let i = 0; i <= distinctDates.length - 3; i++) {
    const d1 = new Date(distinctDates[i]);
    const d2 = new Date(distinctDates[i+1]);
    const d3 = new Date(distinctDates[i+2]);
    
    // Cálculo de diferença limpa em dias
    const diff1 = (d2 - d1) / (1000 * 60 * 60 * 24); 
    const diff2 = (d3 - d2) / (1000 * 60 * 60 * 24);
    
    if (diff1 === 1 && diff2 === 1) { 
      rule3Applied = true;
      break;
    }
  }

  const shiftsPerDayCounts = myShifts.reduce((acc, curr) => {
    acc[curr.date] = (acc[curr.date] || 0) + 1;
    return acc;
  }, {});
  const doneThreeInOneDay = Object.values(shiftsPerDayCounts).some(count => count >= 3);

  if (rule3Applied || doneThreeInOneDay) {
    score += 10;
    breakdown.push("Esgotamento Potencial: 3+ plantões consecutivos ou carga extrema (+10 pt)");
  }

  // ----------------------------------------------------
  // REGRA 4: Se estiver escalado em turno noturno → +5 pontos
  // ----------------------------------------------------
  const hasNightShift = shiftsToEvaluate.some(s => s.shift && s.shift.toLowerCase() === "noite");
  if (hasNightShift) {
    score += 5;
    breakdown.push("Atenção de Escala: Participação constante no turno noturno (+5 pt)");
  }

  // ----------------------------------------------------
  // REGRA 5: Se tiver falta nos últimos 7 dias → +20 pontos
  // ----------------------------------------------------
  if (absencesLast7Days.length >= 1) {
    score += 20;
    breakdown.push("Sinal de Alerta: Evento de falta registrado nos últimos 7 dias (+20 pt)");
  }

  // ----------------------------------------------------
  // CLASSIFICAÇÃO FINAL DE RISCO (Progressão Suave)
  // ----------------------------------------------------
  // 0 - 24 -> low (Baixo Risco)
  // 25 - 49 -> medium (Médio Risco)
  // 50+ -> high (Alto Risco)
  let level = "low";
  if (score >= 50) {
    level = "high";
  } else if (score >= 25) {
    level = "medium";
  }

  return {
    score,
    level,
    breakdown
  };
}
