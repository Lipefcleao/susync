// [PASSO 2] Leitura do JSON (Dados Mockados) 
// REQUISITO: "sem chamadas externas, apenas leitura local"
// Nós importamos os arquivos JSON físicos criados que atuam simulando um retorno de um banco de dados
import professionalsData from '../data/professionals.json';
import shiftsData from '../data/shifts.json';
import absencesData from '../data/absences.json';

// [PASSO 3] Criação de funções de carregamento puras para popular a memória da UI
/**
 * Retorna a lista completa de profissionais.
 */
export function getProfessionals() {
  return professionalsData;
}

/**
 * Retorna a lista de escalas de plantões agendadas.
 */
export function getShifts() {
  return shiftsData;
}

/**
 * Retorna o registro de faltas e absenteísmos.
 */
export function getAbsences() {
  return absencesData;
}

// ============================================
// FUNÇÕES AUXILIARES DE SUPORTE (EXTRAS DE MODELAGEM)
// ============================================

/**
 * Retorna as escalas já cruzadas e consolidadas com os dados do profissional responsável e se houve falta registrada.
 * Pode ser usada opcionalmente caso escale a listagem das Escalas na UI futuramente.
 */
export function getConsolidatedShifts() {
  return shiftsData.map((shift) => {
    const professional = professionalsData.find((p) => p.id === shift.professionalId);
    const absence = absencesData.find((a) => a.shiftId === shift.id);
    
    return {
      ...shift,
      professionalName: professional ? professional.name : 'Profissional Desconhecido',
      professionalRole: professional ? professional.role : 'N/A',
      professionalContact: professional ? professional.contact : 'N/A',
      hasAbsence: !!absence,
      absenceReason: absence ? absence.reason : null,
      absenceStatus: absence ? absence.status : 'Confirmado' 
    };
  });
}

/**
 * Retorna algumas estatísticas simples legadas caso opte por não usar o metrics.js puro.
 */
export function getDashboardStats() {
  const totalShifts = shiftsData.length;
  const totalAbsences = absencesData.length;
  const coverageRate = totalShifts > 0 ? (((totalShifts - totalAbsences) / totalShifts) * 100).toFixed(1) : 0;
  
  return {
    totalProfessionals: professionalsData.length,
    totalShifts,
    totalAbsences,
    coverageRate: `${coverageRate}%`
  };
}
