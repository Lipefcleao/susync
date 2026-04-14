import { calculateMetrics } from './metrics';
import { calculateRisk } from './riskEngine';

/**
 * [PASSO 9] Motor de Insights para Apoio Executivo
 * Dispara percepções analíticas e táticas utilizando leituras determinísticas sobre o banco em tela.
 * Retorna no máximo 3 insights focados para apoiar a tomada de decisão do Gestor de Operações.
 */
export function generateInsights(data, currentDate = new Date()) {
  const { professionals = [], shifts = [], absences = [] } = data;
  const insights = [];
  
  // Validação preventiva contra bases vazias
  if (shifts.length === 0 || absences.length === 0) {
    return [{
      title: "Cenário Operacional Ouro",
      description: "Nenhuma oscilação grave registrada que gere desfalques agudos no sistema operacional de rede.",
      severity: "info"
    }];
  }

  const metrics = calculateMetrics(data);

  // ----------------------------------------------------
  // GATILHO 1: Absenteísmo Global em Nível Crítico
  // ----------------------------------------------------
  const globalRate = parseFloat(metrics.formattedRate.replace('%', ''));
  if (globalRate >= 15) {
    insights.push({
      title: "Índice Crítico de Absenteísmo",
      description: `A taxa global de evasão de escalas atingiu patamar agudo (${globalRate.toFixed(1)}%), comprometendo a relação padronizada de profissional-paciente e a assistência contínua.`,
      severity: "critical"
    });
  } else if (globalRate >= 8) {
    insights.push({
      title: "Alerta de Variação de Absenteísmo",
      description: `A métrica de déficit evoluiu para ${globalRate.toFixed(1)}%. Há um risco elevado de sobrecarga assistencial transferida às equipes remanescentes do plantão.`,
      severity: "warning"
    });
  }

  // ----------------------------------------------------
  // GATILHO 2: Carga Distorcida de Horários (Conflito de Turnos)
  // ----------------------------------------------------
  const shiftsArray = Object.entries(metrics.absencesByShift);
  // Identifica se algum turno concentra desproporcionalmente as faltas (+ de 50%).
  if (shiftsArray.length > 0) {
    shiftsArray.sort((a, b) => b[1] - a[1]);
    const [piorTurno, count] = shiftsArray[0];
    const percentageOfTurn = (count / absences.length) * 100;
    
    if (count >= 3 && percentageOfTurn >= 50) {
      insights.push({
        title: `Prevalência de Absenteísmo: Turno da ${piorTurno}`,
        description: `O período da ${piorTurno} concentra ${percentageOfTurn.toFixed(0)}% das evasões indexadas. Recomenda-se auditoria de dimensionamento e revisão das condições estressoras associadas a este período.`,
        severity: "warning"
      });
    }
  }

  // ----------------------------------------------------
  // GATILHO 3: Furos Agudos por Departamento 
  // ----------------------------------------------------
  const absencesBySector = {};
  absences.forEach(abs => {
    const s = shifts.find(item => item.id === abs.shiftId);
    if (s && s.department) {
      absencesBySector[s.department] = (absencesBySector[s.department] || 0) + 1;
    }
  });

  const sectorRanking = Object.entries(absencesBySector).sort((a, b) => b[1] - a[1]);
  if (sectorRanking.length > 0) {
    const [worstedSector, countSector] = sectorRanking[0];
    if (countSector >= 4) {
      insights.push({
        title: `Déficit Assistencial Iminente: ${worstedSector}`,
        description: `A unidade do(a) ${worstedSector} apresenta perda progressiva de profissionais. Indicado o remanejamento imediato de contingente para assegurar os protocolos de cuidados mínimos.`,
        severity: "critical"
      });
    }
  }

  // ----------------------------------------------------
  // GATILHO 4: Colapso Comportamental do Profissional
  // ----------------------------------------------------
  let highRiskCount = 0;
  professionals.forEach(p => {
    const r = calculateRisk(p.id, data, currentDate);
    if (r.level === 'high') highRiskCount++;
  });

  if (highRiskCount >= 2) {
    insights.push({
      title: "Sinais de Condição de Burnout Mapeados",
      description: `O monitoramento detectou predição estatística de exaustão laboral crônica em ${highRiskCount} indivíduo(s). Recomenda-se encaminhamento formal à Medicina do Trabalho para profilaxia.`,
      severity: "critical"
    });
  } else if (highRiskCount === 1) {
    insights.push({
      title: "Falta Atípica e Risco Laboral Isolado",
      description: "Verificou-se casuística elevada de lacunas operacionais por um integrante específico. Indicada análise preventiva de saúde ocupacional para mitigar evasão definitiva.",
      severity: "info"
    });
  }

  // ----------------------------------------------------
  // FILTRAGEM FINAL E PRIORIZAÇÃO POR SEVERIDADE (Máximo 3)
  // ----------------------------------------------------
  const weight = { critical: 3, warning: 2, info: 1 };
  
  // Remove alertas duplicados de tema (Ex: caso haja Warning Global e Critical Global simultaneamente)
  // Ordena pelo peso de gravidade e recorta entregando aos gestores apenas o Top 3 para foco total.
  insights.sort((a, b) => weight[b.severity] - weight[a.severity]);
  
  return insights.slice(0, 3);
}
