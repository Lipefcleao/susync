/**
 * [PASSO 4] Função calculateMetrics para o SUSync
 * Responsável por mastigar os dados em agregados matemáticos para alimentar os visuais.
 * 
 * @param {Object} data Objeto contendo { professionals, shifts, absences }
 * @returns {Object} Métricas calculadas prontas para uso em UI/Dashboards
 */
export function calculateMetrics(data) {
  const { shifts = [], absences = [] } = data;

  // REQUISITO: "Calcular 1. total de escalas e 2. total de faltas"
  const totalShifts = shifts.length;
  const totalAbsences = absences.length;

  // REQUISITO: "Calcular 3. Taxa de absenteísmo global"
  const absenteeismRateStr = totalShifts === 0 
    ? "0" 
    : ((totalAbsences / totalShifts) * 100).toFixed(1);
    
  // Inicializa estruturas para cruzamento e agregadores
  const absencesByShift = {};
  const absencesByDepartment = {};

  // REQUISITO: "Calcular 4. Faltas por turno e 5. Faltas por setor"
  absences.forEach((absence) => {
    // Cruza a foreign-key "shiftId" para resgatar o tipo de turno e o Setor de onde aquela Falta originou
    const relatedShift = shifts.find((s) => s.id === absence.shiftId);
    
    if (relatedShift) {
      const shiftName = relatedShift.shift; 
      const deptName = relatedShift.department;   

      // Acumula os dados dentro dessa key do objeto instanciado
      absencesByShift[shiftName] = (absencesByShift[shiftName] || 0) + 1;
      absencesByDepartment[deptName] = (absencesByDepartment[deptName] || 0) + 1;
    }
  });

  // REQUISITO: "Código simples. Retorno pronto para a UI" (Transformei num objeto achatado JSON-like)
  return {
    totalShifts,
    totalAbsences,
    absenteeismRate: Number(absenteeismRateStr),  
    formattedRate: `${absenteeismRateStr}%`,     
    absencesByShift,
    absencesByDepartment
  };
}
