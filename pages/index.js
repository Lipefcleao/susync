import { useState, useMemo } from 'react';
import Head from 'next/head';

// [PASSO 3] Leitura dos dados JSON no SUSync
import { getProfessionals, getShifts, getAbsences } from '../lib/dataAccess';

// [PASSO 4] Arquitetura de Métricas
import { calculateMetrics } from '../lib/metrics';

// [PASSO 6] Alertas (Sistema Mestre)
import { generateAlerts } from '../lib/alertEngine';

// [PASSO 5] Motor de Risco Médico
import { calculateRisk } from '../lib/riskEngine';

// [PASSO 9] Motor de Insights Diretos
import { generateInsights } from '../lib/insightsEngine';


export default function Dashboard() {
  
  const [activeTab, setActiveTab] = useState('operacao'); 
  const [alertTab, setAlertTab] = useState('pessoas'); 
  
  const [database, setDatabase] = useState({
    professionals: getProfessionals(),
    shifts: getShifts(),
    absences: getAbsences(),
  });

  const simulationDate = new Date("2026-04-16T10:00:00Z");

  const metrics = useMemo(() => calculateMetrics(database), [database]);
  const alerts = useMemo(() => generateAlerts(database, simulationDate), [database]);
  const insights = useMemo(() => generateInsights(database, simulationDate), [database]);

  // Divisão Inteligente dos Alertas em Abas
  const pessoasAlerts = alerts.filter(a => a.category === 'pessoas');
  const turnosAlerts = alerts.filter(a => a.category === 'turnos');
  const setoresAlerts = alerts.filter(a => a.category === 'setores');
  const activeAlertsList = alertTab === 'pessoas' ? pessoasAlerts : alertTab === 'turnos' ? turnosAlerts : setoresAlerts;

  const operationTableData = useMemo(() => {
    return database.professionals.map(prof => {
      const risk = calculateRisk(prof.id, database, simulationDate);
      const myAbsences = database.absences.filter(a => a.professionalId === prof.id);
      const myShifts = database.shifts.filter(s => s.professionalId === prof.id);
      
      let ultimaAusencia = "—";
      if (myAbsences.length > 0) {
        const lastA = myAbsences[myAbsences.length - 1];
        if(lastA.reportedOn) {
          const date = new Date(lastA.reportedOn);
          ultimaAusencia = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        }
      }

      const anchorDateString = simulationDate.toISOString().split('T')[0];
      const todayMatch = myShifts.find(s => s.date === anchorDateString) || myShifts[myShifts.length - 1];
      const setor = todayMatch ? todayMatch.department : "—";
      const turno = todayMatch ? todayMatch.shift : "Não Alocado";

      return {
        ...prof,
        setor,
        turno,
        faltas: myAbsences.length,
        ultimaAusencia,
        score: risk.score,
        level: risk.level
      };
    }).sort((a, b) => b.score - a.score);
  }, [database, simulationDate]);

  const absPorProfissional = useMemo(() => {
    const counts = {};
    database.absences.forEach(a => counts[a.professionalId] = (counts[a.professionalId] || 0) + 1);
    
    return Object.entries(counts)
      .map(([id, total]) => {
         const prof = database.professionals.find(p => p.id === id);
         return { 
           id, 
           name: prof?.name || 'Desconhecido', 
           role: prof?.role || 'N/A', 
           total 
         };
      })
      .sort((a, b) => b.total - a.total);
  }, [database]);

  // Constantes de Escalados do CSS de Gráficos
  const top3Profissionais = absPorProfissional.slice(0, 3);
  const maxValueFaltasPerProf = absPorProfissional.length > 0 ? absPorProfissional[0].total : 1;
  const maxValueTurnos = Object.values(metrics.absencesByShift).reduce((a, b) => Math.max(a, b), 1);
  const sectoresSorted = Object.entries(metrics.absencesByDepartment).sort((a,b) => b[1] - a[1]);
  const maxSectorFaltas = sectoresSorted.length > 0 ? sectoresSorted[0][1] : 1;


  // ----------------------------------------------------
  // GATILHO REVERTIDO DE UX (Simulação Mestra Unitária)
  // ----------------------------------------------------
  const simularNovaFalta = () => {
    const turnoAlvo = database.shifts.find(s => !database.absences.some(a => a.shiftId === s.id));
    if (!turnoAlvo) return alert("Não há mais escalas sem registro de ausência no sistema atual.");

    const novaAusencia = {
      id: `a_simulated_${Date.now()}`,
      shiftId: turnoAlvo.id,
      professionalId: turnoAlvo.professionalId,
      reason: "Registro randômico da simulação",
      status: "Em Análise",
      reportedOn: simulationDate.toISOString() // Data congelada ancorando a ação como "Recente"
    };

    setDatabase(prev => ({
      ...prev,
      absences: [...prev.absences, novaAusencia]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <Head>
        <title>SUSync | Gestão de Escalas</title>
      </Head>

      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-0 md:h-16 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-8 w-full md:w-auto">
            <h1 className="text-xl font-bold text-white tracking-wide w-full text-center md:text-left">
              SU<span className="text-blue-500">Sync</span>
            </h1>
            
            <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-full md:w-auto overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('operacao')}
                className={`px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 md:flex-none ${
                  activeTab === 'operacao' 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Painel Geral
              </button>
              <button
                onClick={() => setActiveTab('dashboards')}
                className={`px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 md:flex-none ${
                  activeTab === 'dashboards' 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Métricas e Dados
              </button>
              <button
                onClick={() => setActiveTab('alertas')}
                className={`px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center justify-center gap-2 flex-1 md:flex-none ${
                  activeTab === 'alertas' 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inteligência
                {alerts.length > 0 && (
                   <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse hidden sm:block"></span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
             {alerts.length > 0 && activeTab !== 'alertas' && (
               <div className="flex items-center gap-2 cursor-pointer bg-amber-500/10 text-amber-500 text-[10px] sm:text-xs px-2.5 sm:px-3 py-1.5 font-bold uppercase rounded-md border border-amber-500/20 hover:bg-amber-500/20 transition-colors whitespace-nowrap" onClick={() => setActiveTab('alertas')}>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  {alerts.length} Alertas <span className="hidden sm:inline">Ativos</span>
               </div>
             )}
            <div className="text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg whitespace-nowrap">
              Painel de Avaliação
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        
        {/* ==========================================
            ABA 1: OPERAÇÃO 
            ========================================== */}
        {activeTab === 'operacao' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            <header className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 mb-8 mt-2 text-center md:text-left">
              <div className="w-full">
                <h2 className="text-2xl font-bold text-white mb-2">Gerenciamento de Profissionais</h2>
                <p className="text-slate-400 max-w-2xl mx-auto md:mx-0">
                  Acompanhe a relação dos profissionais escalados, status temporal de ausências registradas e a predição determinística de risco do sistema.
                </p>
              </div>
              <button 
                onClick={simularNovaFalta}
                className="px-6 py-3 md:px-5 md:py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all active:scale-95 group flex items-center justify-center gap-2 shrink-0 shadow-sm border border-blue-500/50 w-full md:w-auto"
              >
                <span className="text-lg leading-none">+</span> Registrar Nova Ausência
              </button>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-950/50 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Profissional</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Setor Operacional</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider text-center">Faltas Acumuladas</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider text-center">Último Registro</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Nível de Risco</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {operationTableData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                              {row.name.substring(0, 2).toUpperCase().replace('.', '')}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">{row.name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{row.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-200 font-medium">{row.setor}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">{row.turno}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-sm font-bold ${
                            row.faltas > 1 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 
                            row.faltas === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {row.faltas}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-slate-300">{row.ultimaAusencia}</span>
                        </td>
                        <td className="px-6 py-4">
                          <BadgeRisco level={row.level} score={row.score} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            ABA 2: DASHBOARDS
            ========================================== */}
        {activeTab === 'dashboards' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <header className="mb-8 mt-2">
              <h2 className="text-2xl font-bold text-white mb-2">Painel Analítico de Saúde</h2>
              <p className="text-slate-400">Visão consolidada das volumetrias de escala mapeadas nos plantões da unidade.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
              
              <div className="lg:col-span-4 flex flex-col gap-6">
                 <div className="bg-slate-900 border border-slate-800 border-t-2 border-t-blue-500/50 rounded-xl p-6 flex flex-col justify-center h-[140px] shadow-sm">
                   <h3 className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-wide">Total de Ocorrências</h3>
                   <div className="text-5xl font-extrabold text-blue-500">{metrics.totalAbsences}</div>
                 </div>
                 
                 <div className="bg-slate-900 border border-slate-800 border-t-2 border-t-rose-500/50 rounded-xl p-6 flex flex-col justify-center h-[140px] shadow-sm">
                   <h3 className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-wide">Taxa de Absenteísmo</h3>
                   <div className="text-5xl font-extrabold text-rose-400">{metrics.formattedRate}</div>
                 </div>
              </div>

              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 border-t-2 border-t-slate-700/50 rounded-xl p-6 shadow-sm">
                 <h3 className="text-slate-300 text-base font-semibold mb-5 flex gap-2 items-center">
                   Evasão Aguda (Top 3 Indivíduos)
                 </h3>
                 <div className="space-y-3">
                    {top3Profissionais.length === 0 && <p className="text-slate-500 text-sm">Sem registros de ausência encontrados.</p>}
                    {top3Profissionais.map((prof, index) => (
                      <div key={prof.id} className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                         <div className={`w-10 h-10 rounded-md flex items-center justify-center font-black text-lg shadow-sm border ${index === 0 ? 'bg-rose-500/20 text-rose-500 border-rose-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                           {index + 1}º
                         </div>
                         <div className="flex-1">
                           <div className="text-slate-100 font-bold text-sm mb-0.5">{prof.name}</div>
                           <div className="text-xs text-slate-400 font-medium">{prof.role}</div>
                         </div>
                         <div className="text-right">
                           <span className="text-lg font-bold text-slate-200">{prof.total} <span className="text-sm font-medium text-slate-500">faltas</span></span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

            </div>

            {/* Nova Trinca (Grid de 3 Colunas) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full mt-2">
               
               {/* 1. Ausências por Turno (Gráfico CSS Vertical) */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-[320px] flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-slate-300 text-base font-semibold mb-1">Impacto por Turno</h3>
                    <p className="text-slate-500 text-xs mb-6">Contagem de registros na linha do tempo diária</p>
                  </div>
                  
                  <div className="flex items-end justify-around w-full flex-1 border-b border-slate-800 pb-2">
                    {['Manhã', 'Tarde', 'Noite'].map(turno => {
                      const count = metrics.absencesByShift[turno] || 0;
                      const heightPercent = maxValueTurnos > 0 ? (count / maxValueTurnos) * 100 : 0;
                      return (
                        <div key={turno} className="flex flex-col items-center justify-end group w-1/4 h-full relative pt-8">
                          
                          <div className="absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold bg-slate-800 px-3 py-1 rounded-md text-white z-10 pointer-events-none text-center shadow border border-slate-700">
                            {count}
                          </div>
                          
                          <div 
                            className={`w-full rounded-t transition-all duration-1000 ease-in-out relative shadow-[inset_0_4px_4px_rgba(255,255,255,0.1)] ${count > 0 ? (turno === 'Noite' ? 'bg-indigo-500' : 'bg-blue-500') : 'bg-slate-800'}`}
                            style={{ height: `${heightPercent > 0 ? Math.max(heightPercent, 2) : 1}%` }}
                          />
                          
                          <span className="text-slate-400 text-xs font-bold mt-4 uppercase tracking-wider absolute -bottom-5">{turno}</span>
                        </div>
                      )
                    })}
                  </div>
               </div>

               {/* 2. NOVO - Ausências por Setor Operacional (Gráfico Barras Horizontais) */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-[320px] flex flex-col shadow-sm">
                  <div>
                    <h3 className="text-slate-300 text-base font-semibold mb-1">Pressão por Área (Setores)</h3>
                    <p className="text-slate-500 text-xs mb-5">Quais departamentos sofrem déficit atual</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                    {sectoresSorted.length === 0 && <p className="text-slate-500 text-sm mt-4 text-center">Seguro.</p>}
                    {sectoresSorted.map(([dept, count]) => {
                      const widthPercent = (count / maxSectorFaltas) * 100;
                      return (
                        <div key={dept} className="w-full relative group">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-slate-200 font-semibold text-xs truncate max-w-[80%] pr-2 group-hover:text-amber-400 transition-colors">{dept}</span>
                            <span className="text-slate-400 font-bold text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{count}</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-full transition-all duration-1000 ease-out shadow-sm"
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
               </div>

               {/* 3. Todas as Ausências por Profissional Geral (Barras Horizontais Simplificadas) */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-[320px] flex flex-col shadow-sm">
                  <div>
                    <h3 className="text-slate-300 text-base font-semibold mb-1">Listagem Geral de Evasão</h3>
                    <p className="text-slate-500 text-xs mb-5">Micro-barras por participante listado</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                    {absPorProfissional.length === 0 && <p className="text-slate-500 text-sm mt-4 text-center">Ninguém faltou.</p>}
                    {absPorProfissional.map(prof => {
                      const widthPercent = (prof.total / maxValueFaltasPerProf) * 100;
                      return (
                        <div key={prof.id} className="w-full group">
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="text-slate-400 font-medium group-hover:text-slate-200 transition-colors">{prof.name}</span>
                            <span className="text-slate-500">{prof.total}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-slate-500 group-hover:bg-slate-400 rounded-full transition-all duration-1000"
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
               </div>

            </div>
          </div>
        )}

        {/* ==========================================
            ABA 3 (NOVA): ALERTAS E INSIGHTS EXECUTIVOS
            ========================================== */}
        {activeTab === 'alertas' && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            <header className="mb-8 mt-2">
              <h2 className="text-2xl font-bold text-white mb-2">Diretrizes e Alertas</h2>
              <p className="text-slate-400 max-w-3xl">Painel de aconselhamento analítico e triagem dos eventos de exceção da sua unidade. Leia atentamente as sugestões embutidas.</p>
            </header>

            {/* SEÇÃO 1: CENTRAL DE TRIAGEM MOVIDO PARA CIMA */}
            <section>
              <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl min-h-[400px]">
                
                <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-5 mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                      Central Técnica de Alertas
                    </h3>
                    <p className="text-xs text-slate-500">Mapeador reativo que captura desvios iminentes baseado nas faltas passadas e futuras.</p>
                  </div>
                  
                  <div className="flex bg-slate-950 p-1.5 rounded-lg border border-slate-800 shadow-inner w-full md:w-auto overflow-x-auto scrollbar-hide">
                    <button 
                      onClick={() => setAlertTab('pessoas')} 
                      className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none ${alertTab === 'pessoas' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Pessoas <span className={`px-1.5 py-0.5 rounded text-xs ${pessoasAlerts.length > 0 ? 'bg-rose-500 text-white' : 'bg-slate-900 text-slate-500'}`}>{pessoasAlerts.length}</span>
                    </button>
                    <button 
                      onClick={() => setAlertTab('turnos')} 
                      className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none ${alertTab === 'turnos' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Turnos <span className={`px-1.5 py-0.5 rounded text-xs ${turnosAlerts.length > 0 ? 'bg-amber-500 text-white' : 'bg-slate-900 text-slate-500'}`}>{turnosAlerts.length}</span>
                    </button>
                    <button 
                      onClick={() => setAlertTab('setores')} 
                      className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none ${alertTab === 'setores' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Setores <span className={`px-1.5 py-0.5 rounded text-xs ${setoresAlerts.length > 0 ? 'bg-amber-500 text-white' : 'bg-slate-900 text-slate-500'}`}>{setoresAlerts.length}</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 relative">
                  {alerts.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                      <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <h4 className="text-emerald-400 font-bold text-lg mb-1">A operação segue o Padrão Ouro</h4>
                      <p className="text-emerald-500/70 text-sm">Nenhum evento anômalo que quebre a estabilidade foi detectado pelo motor.</p>
                    </div>
                  ) : activeAlertsList.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center p-10 text-center text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800 border-dashed">
                      <p className="font-medium text-sm">Filtro silencioso. Nenhuma detecção capturada especificamente sob esta lente.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-3 custom-scrollbar">
                      {activeAlertsList.map((alerta, idx) => (
                        <AlertMessage key={`${alertTab}_${idx}`} alert={alerta} />
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* SEÇÃO 2: INSIGHTS (Menores e abaixo dos alertas, conforme pedido) */}
            <section className="mt-8 pt-4 border-t border-slate-800/50">
              <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Insights Automáticos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.map((insight, i) => {
                  const styleMap = {
                    critical: 'bg-rose-500/5 border-rose-500/20 text-rose-400 indicator-rose-500 title-rose-100',
                    warning: 'bg-amber-500/5 border-amber-500/20 text-amber-400 indicator-amber-500 title-amber-100',
                    info: 'bg-blue-500/5 border-blue-500/20 text-blue-400 indicator-blue-500 title-blue-100'
                  };
                  const colorMeta = styleMap[insight.severity];
                  
                  return (
                    <div key={i} className={`p-4 rounded-lg border flex flex-col justify-start relative overflow-hidden transition-all hover:bg-slate-900 ${colorMeta.split(' ').slice(0,3).join(' ')}`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${colorMeta.split(' ')[3].replace('indicator-','')}`}></div>
                        <div className="mb-2 inline-flex items-center gap-1.5">
                           <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest ${colorMeta.split(' ')[3].replace('indicator-','bg-')} text-white`}>
                              {insight.severity}
                           </span>
                        </div>
                        <h4 className={`text-sm font-bold leading-tight mb-2 ${colorMeta.split(' ')[4].replace('title-','')}`}>
                          {insight.title}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          {insight.description}
                        </p>
                    </div>
                  )
                })}
              </div>
            </section>

          </div>
        )}
        
      </main>
    </div>
  );
}


function BadgeRisco({ level, score }) {
  const mapCores = {
    high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  };

  const mapTextos = {
    high: 'Alto',
    medium: 'Atenção',
    low: 'Seguro'
  };

  return (
    <div className="flex items-center gap-3">
      <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${mapCores[level]}`}>
        {mapTextos[level]} <span className="opacity-70 ml-1">({score})</span>
      </span>
    </div>
  );
}


function AlertMessage({ alert }) {
  const isHigh = alert.priority === 'high';
  const colorMap = {
    bg: isHigh ? 'bg-rose-500/5' : 'bg-amber-500/5',
    border: isHigh ? 'border-rose-500/20' : 'border-amber-500/20',
    iconText: isHigh ? 'text-rose-400' : 'text-amber-400',
    badgeBg: isHigh ? 'bg-rose-500' : 'bg-amber-500',
    priorityText: isHigh ? 'Crítico/Prioritário' : 'Análise Requerida'
  };

  const formatText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white font-bold">{part.replace(/\*\*/g, '')}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`p-5 rounded-xl border ${colorMap.bg} ${colorMap.border} shadow-sm flex flex-col justify-between hover:bg-slate-900 transition-colors`}>
      <div>
        <div className="flex justify-between items-start mb-3">
          <span className={`text-[9px] font-black uppercase tracking-widest text-white ${colorMap.badgeBg} px-2 py-0.5 rounded`}>
            {colorMap.priorityText}
          </span>
          <span className={`text-xs font-black uppercase ${colorMap.iconText} truncate max-w-[150px]`}>
            {alert.type}
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed font-medium">
          {formatText(alert.message)}
        </p>
      </div>
    </div>
  );
}
