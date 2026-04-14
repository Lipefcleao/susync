import { calculateRisk } from './riskEngine';

// [PASSO 6] Implementação da geração de alertas atrelado aos Riscos Calculados
// Todas as REGRAS OBRIGATÓRIAS exigidas mapeadas em uma array sem persistência (Recalculado Sempre)
export function generateAlerts(data, currentDate = new Date()) {
  const { professionals = [], shifts = [], absences = [] } = data;
  const alerts = [];

  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  // ----------------------------------------------------
  // REGRA 1: Se profissional tiver risco alto → gerar alerta "Pessoas" / priority "high"
  // ----------------------------------------------------
  const highRiskProfessionalsIds = new Set();
  professionals.forEach(professional => {
    const risk = calculateRisk(professional.id, data, currentDate);
    
    // Agora o High começa de 50 pra cima de acordo com a nossa calibração posterior
    if (risk.level === 'high') {
      highRiskProfessionalsIds.add(professional.id); 
      
      alerts.push({
        category: 'pessoas', // <-- Flag adicionada para Filtragem do Dashboard
        type: 'ALTO RISCO DE EVASÃO',
        message: `O(a) profissional ${professional.name} (Risco: ${risk.score}) apresenta alta disfunção recorrente. Substituição preventiva emergencial recomendada.`,
        priority: 'high'
      });
    }
  });

  // ----------------------------------------------------
  // REGRA EXTRA 1B: Existir ausência detectada recem (7 dias) engatilhando "Pessoas"
  // ----------------------------------------------------
  const recentAbsences = absences.filter(absence => {
    const relatedShift = shifts.find(s => s.id === absence.shiftId);
    const absDate = relatedShift ? new Date(relatedShift.date) : new Date(absence.reportedOn);
    return absDate >= sevenDaysAgo;
  });

  if (recentAbsences.length > 0) {
    const totalRecent = recentAbsences.length;
    const latestAbsenceId = recentAbsences[recentAbsences.length - 1].professionalId;
    const latestProf = professionals.find(p => p.id === latestAbsenceId);
    const latestName = latestProf ? latestProf.name : 'Vários';

    alerts.push({
      category: 'pessoas', // <-- Categoria Pessoas
      type: 'TENDÊNCIA ATUAL DE AFASTAMENTO',
      message: `Identificadas ${totalRecent} nova(s) falta(s) reportadas na última semana (Último reporte: ${latestName}). Fique atento à desmobilização precoce destas vagas.`,
      priority: 'high'
    });
  }

  // ----------------------------------------------------
  // REGRA 2: Concentração de faltas agrupadas por TURNO ("Turnos")
  // ----------------------------------------------------
  const absencesByShiftName = {};
  absences.forEach(absence => {
    const relatedShift = shifts.find(s => s.id === absence.shiftId);
    if (relatedShift) {
      const shiftName = relatedShift.shift; 
      absencesByShiftName[shiftName] = (absencesByShiftName[shiftName] || 0) + 1;
    }
  });

  for (const [shiftName, count] of Object.entries(absencesByShiftName)) {
    if (count >= 3) {
      alerts.push({
        category: 'turnos', // <-- Nova Categoria Turnos
        type: 'CONCENTRAÇÃO ANORMAL',
        message: `A faixa de horário da ${shiftName} concentra demasiadas faltas não-resolvidas (${count} registros na janela atual). Furo de cobertura em risco.`,
        priority: 'medium'
      });
    }
  }

  // ----------------------------------------------------
  // REGRA 3: Concentração de faltas agrupadas por SETOR ("Setores")
  // ----------------------------------------------------
  const absencesBySector = {};
  absences.forEach(absence => {
    const relatedShift = shifts.find(s => s.id === absence.shiftId);
    if (relatedShift) {
      const sectionName = relatedShift.department; 
      absencesBySector[sectionName] = (absencesBySector[sectionName] || 0) + 1;
    }
  });

  for (const [sectionName, count] of Object.entries(absencesBySector)) {
    // Se um mesmo setor da UTI ou PS atingir 2 baixas ou mais é classificado no Motor:
    if (count >= 2) {
      alerts.push({
        category: 'setores', // <-- Nova Categoria Setores
        type: 'COLAPSO DE LOCALIDADE',
        message: `O setor **${sectionName}** atingiu déficit severo com ${count} absenteísmos consolidados no período de apuração atual. Direcione profissionais interinos para suporte operacional iminente.`,
        priority: 'high'
      });
    }
  }

  return alerts;
}
