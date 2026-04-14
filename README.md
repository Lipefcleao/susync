# SUSync 🚑📊

## 💡 Visão Geral

O **SUSync** é uma aplicação web desenvolvida para apoiar a gestão de escalas e o monitoramento de absenteísmo em ambientes de saúde pública, como a Central de Regulação do SUS.

A solução simula, de forma interativa, como gestores podem identificar padrões de ausência, antecipar riscos e tomar decisões mais rápidas e eficientes.

---

## 🎯 Problema

A Central de Regulação enfrenta altos índices de absenteísmo de profissionais, o que gera:

* sobrecarga das equipes presentes
* desorganização das escalas
* aumento no tempo de resposta
* dificuldade na tomada de decisão

Além disso, a ausência de ferramentas analíticas dificulta a identificação de padrões e ações preventivas.

---

## 🚀 Solução

O SUSync propõe uma plataforma simples e intuitiva que permite:

* visualizar profissionais e suas escalas
* monitorar ocorrências de absenteísmo
* calcular risco de ausência por profissional
* gerar alertas automáticos
* apresentar insights acionáveis para gestão

Tudo isso em uma interface web acessível e sem necessidade de instalação.

---

## 🧠 Diferencial

O principal diferencial do SUSync é o uso de um **motor de decisão baseado em regras (IA explicável)** que permite:

* identificar padrões de faltas
* calcular risco de absenteísmo em tempo real
* gerar insights claros para gestores

Para o protótipo, utilizamos dados simulados. A arquitetura foi pensada para evoluir para modelos preditivos com dados reais.

---

## ⚙️ Como Funciona

A aplicação é dividida em duas áreas principais:

### 🔹 Operação

* tabela de profissionais
* visualização de faltas e turnos
* score de risco por profissional

### 🔹 Dashboards

* indicadores de absenteísmo
* gráficos por turno e profissional
* alertas automáticos
* insights estratégicos

---

## 🎮 Simulação (Modo Demo)

O sistema utiliza dados simulados e permite testar cenários reais através de botões:

* **Simular ausência pontual** → impacto leve
* **Simular padrão de faltas** → tendência de risco
* **Simular caso crítico** → cenário de alto risco

Essas interações atualizam automaticamente:

* dashboard
* risco
* alertas
* insights

---

## 🧩 Arquitetura

O SUSync foi desenvolvido como uma aplicação **frontend-only**, focada em velocidade e confiabilidade para demonstração.

### Tecnologias utilizadas:

* Next.js
* React
* Tailwind CSS

### Estrutura:

```
/data       → dados simulados (JSON)
/lib        → lógica de negócio (métricas, risco, alertas)
/pages      → páginas da aplicação
/components → componentes de UI
```

---

## 🔮 Evolução Futura

A solução foi pensada para evoluir facilmente para um ambiente real:

* integração com banco de dados
* conexão com sistemas do SUS
* ingestão de dados históricos
* uso de machine learning para previsão avançada
* autenticação e múltiplos usuários

---

## 🌐 Deploy

A aplicação está hospedada via Vercel e pode ser acessada diretamente pelo navegador.

---

## 🧪 Como Executar Localmente

```bash
# instalar dependências
npm install

# rodar o projeto
npm run dev
```

---

## 🎤 Contexto

Este projeto foi desenvolvido como parte de um hackathon, com foco em:

* impacto social
* viabilidade no contexto do SUS
* simplicidade de implementação
* clareza na tomada de decisão

---

## 👨‍💻 Autor

Projeto desenvolvido para fins de prototipação e validação de solução em ambiente de inovação.

---

## 📌 Licença

Este projeto é apenas um protótipo acadêmico e demonstrativo.
