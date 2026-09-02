// ===== STATE =====
let servers=JSON.parse(localStorage.getItem('llama_servers')||'[]');
let conversations=JSON.parse(localStorage.getItem('llama_convs')||'[]');
let mcps=JSON.parse(localStorage.getItem('llama_mcps')||'[]');
let skills=JSON.parse(localStorage.getItem('llama_skills')||'[]');
let agents=JSON.parse(localStorage.getItem('llama_agents')||'[]');
let subAgents=JSON.parse(localStorage.getItem('llama_subagents')||'[]');
const DEFAULT_AGENTS=[
  {name:'gamedev',desc:'Especialista em recriação de jogos com HTML, CSS e JavaScript.',icon:'🎮',prompt:'Você é um desenvolvedor de jogos especialista em recriar jogos clássicos e populares usando HTML, CSS e JavaScript puro, sem dependências externas. Quando o usuário pedir um jogo, você deve: 1) Escolher mecânicas fiéis ao original; 2) Produzir um único arquivo HTML completo e executável com tudo embutido (HTML+CSS+JS), usando canvas ou DOM conforme o melhor para o jogo; 3) Implementar controles responsivos (teclado/toque), detecção de colisão, pontuação, estados de jogo (início, jogando, game over, vitória) e efeitos visuais/sonoros simples; 4) Garantir código limpo, comentado onde necessário e compatível com navegadores modernos; 5) Explicar como executar e testar o jogo. Entregue o código completo em um bloco de código pronto para copiar e colar.',serverIndex:null,skillIndex:null,temperature:0.8,maxTokens:32768,topP:0.9,maxMsgs:20},
  {name:'escritor',desc:'Escritor de livros em português brasileiro. Estilo culta, informal ou misto. Usa /gramatical para corrigir cada parágrafo.',icon:'📖',prompt:`Você é um escritor profissional especializado em criação de livros, contos, crônicas, romances e qualquer tipo de texto literário ou longo em português brasileiro.

## Estilos de escrita
Você domina três registro e deve aplicar conforme pedido pelo usuário:
- **Culta (formal):** Linguagem formal, culta, com vocabulário rico, frases complexas, concordância impecável, uso correto de crase e regência. Ideal para literatura clássica, acadêmica, textos profissionais.
- **Informal:** Linguagem coloquial, próxima do dia a dia, com expressões populares, frases mais curtas, gírias quando apropriado. Ideal para crônicas modernas, blogs, textos descontraídos.
- **Mista:** Alterna entre formal e informal conforme a necessidade da cena ou personagem. Mais realista e dinâmico.

## Regras de trabalho
1) Quando o usuário pedir para escrever algo, pergunte o estilo desejado (culta/informal/mista) se não especificado;
2) Escreva em parágrafos curtos e bem divididos;
3) Após CADA parágrafo escrito, envie-o para o sub-agente /gramatical usando o comando: /gramatical [parágrafo aqui];
4) Aguarde a resposta do /gramatical e aplique as correções antes de prosseguir;
5) Se o /gramatical indicar que precisa de validação de termos, nomes próprios ou dados históricos, use /pesquisador para consultar;
6) Se houver correções do /gramatical, reescreva o parágrafo corrigido e envie novamente para /gramatical verificar — repita até que o texto esteja correto;
7) Ao final, apresente o texto completo revisado com todos os parágrafos já corrigidos;
8) Se o usuário pedir Continuar, retome de onde parou e siga o mesmo fluxo;
9) Sempre responda em português brasileiro.`,serverIndex:null,skillIndex:null,temperature:0.75,maxTokens:32768,topP:0.85,maxMsgs:30}
];
const DEFAULT_SUBAGENTS=[
  {name:'critico',desc:'Crítico de jogos: analisa gameplay, mecânica, história, áudio e dá feedback construtivo.',icon:'🎯',prompt:'Você é um crítico de jogos experiente. Analise o jogo fornecido de forma profissional e estruturada. Para cada jogo, avalie: 1) Jogabilidade e controles; 2) Mecânicas e profundidade; 3) Progressão e dificuldade; 4) Áudio e visual; 5) Diversão geral. Dê notas de 0 a 10 para cada critério, aponte pontos fortes e fracos com exemplos concretos e sugira melhorias práticas e acionáveis. Seja honesto e específico, nunca genérico. Termine com um veredito final e uma nota geral.',serverIndex:null,temperature:0.7,maxTokens:8192},
  {name:'pesquisador',desc:'Pesquisa informações na web, valid dados, cita fontes e traz respostas fundamentadas.',icon:'🔍',prompt:'Você é um pesquisador rigoroso e metódico. Quando solicitado para pesquisar algo: 1) Use wcurl para buscar informações em fontes confiáveis; 2) Cruze dados de múltiplas fontes quando possível; 3) Cite as fontes utilizadas; 4) Distingua fatos de opiniões; 5) Apresente a informação de forma clara e objetiva, com dados atualizados; 6) Se a informação for conflitante entre fontes, apresente ambos os lados e indique qual é mais confiável e por quê. Sempre responda em português brasileiro.',serverIndex:null,temperature:0.5,maxTokens:16384},
  {name:'gramatical',desc:'Corrige gramática e pontuação de textos em português brasileiro. Usa /pesquisador se precisar consultar regras ou termos.',icon:'✍️',prompt:'Você é um revisor de texto especializado em português brasileiro. Quando receber um parágrafo ou texto para corrigir: 1) Corrija erros gramaticais (concordância verbal e nominal, regência, crase, coloquialismos inadequados); 2) Corrija pontuação (vírgulas, pontos, dois-pontos, ponto e vírgula, travessões, parênteses); 3) Corrija ortografia e acentuação conforme o novo Acordo Ortográfico; 4) Preserve o estilo e tom do autor — não reescreva o texto, apenas corrija o que estiver errado; 5) Ao final, apresente o texto corrigido e, se houver muitas alterações, liste as principais correções feitas com uma breve explicação de cada uma; 6) Se encontrar termos técnicos, nomes próprios ou expressões que precisam de validação, use /pesquisador para consultar a forma correta. Sempre responda em português brasileiro.',serverIndex:null,temperature:0.3,maxTokens:16384}
];
if(!agents.length){agents=DEFAULT_AGENTS;localStorage.setItem('llama_agents',JSON.stringify(agents));}
else{
  const defaultsToAdd=DEFAULT_AGENTS.filter(d=>!agents.find(a=>a.name===d.name));
  if(defaultsToAdd.length){agents=agents.concat(defaultsToAdd);localStorage.setItem('llama_agents',JSON.stringify(agents));}
}
if(!subAgents.length){subAgents=DEFAULT_SUBAGENTS;localStorage.setItem('llama_subagents',JSON.stringify(subAgents));}
else{
  const defaultsToAdd=DEFAULT_SUBAGENTS.filter(d=>!subAgents.find(s=>s.name===d.name));
  if(defaultsToAdd.length){subAgents=subAgents.concat(defaultsToAdd);localStorage.setItem('llama_subagents',JSON.stringify(subAgents));}
}
const DEFAULT_SERVERS=[
  {name:'b.ai',url:'https://api.b.ai',model:'deepseek-v4-flash',apiKey:'sk-1fmwor79p0gnwrez59bwn3vvwx9zuxf6',apiKeyType:'bearer',maxMsgs:20},
  {name:'sensenova',url:'https://token.sensenova.ai',model:'sensenova-6.8-flash-lite',apiKey:'sk-nGaFNPWtFD8rWGfMGUkGi2CNxS92lLWp',apiKeyType:'bearer',proxy:true,maxMsgs:20}
];
let seededServer=false;
DEFAULT_SERVERS.forEach(ds=>{
  const key=s=>(s.url||'').replace(/\/+$/,'').toLowerCase();
  if(!servers.find(s=>key(s)===key(ds))){servers.push({...ds});seededServer=true;}
});
if(seededServer)localStorage.setItem('llama_servers',JSON.stringify(servers));
let activeServer=null,activeConv=null,activeSkill=null,activeAgent=null;
let abortController=null,markdownEnabled=true,cliMode=false;
try{markdownEnabled=JSON.parse(localStorage.getItem('llama_markdown')??'true')!==false;cliMode=JSON.parse(localStorage.getItem('llama_cli_mode')??'false')===true;}catch(e){}
let editingServerIndex=null,editingSkillIndex=null,editingAgentIndex=null,editingSubAgentIndex=null,editingMCPIndex=null,editingOrchIndex=null;
let sidebarVisible=true;
let tokenCount=0,genStartTime=0,speedInterval=null;
let backgroundTasks=[],taskIdCounter=0;
let mcpStatus={},mcpToolsCache={};
let orchestrators=JSON.parse(localStorage.getItem('llama_orchestrators')||'[]');
let activeOrch=null;
const DEFAULT_ORCHESTRATORS=[
  {name:'dev-completo',desc:'Pipeline completo: desenvolvimento + revisão + otimização.',icon:'🏗',serverIndex:null,skillIndex:null,agentIndex:null,subAgentIndices:[],mcpIndices:[],mode:'pipeline',systemPrompt:'Você é um orquestrador de desenvolvimento. Coordene as etapas de criação, revisão e otimização de código.',temperature:0.7,maxTokens:32768,topP:0.9,steps:[{type:'prompt',text:'Analise o pedido do usuário e planeje a implementação.'},{type:'agent',index:0,name:'gamedev'},{type:'subagent',index:0,name:'critico'}]},
  {name:'analise-full',desc:'Análise completa: coleta de dados + processamento + relatório.',icon:'📊',serverIndex:null,skillIndex:null,agentIndex:null,subAgentIndices:[],mcpIndices:[],mode:'sequential',systemPrompt:'Você é um orquestrador de análise. Coordene coleta, processamento e geração de relatórios.',temperature:0.6,maxTokens:16384,topP:0.9,steps:[{type:'prompt',text:'Defina o escopo da análise.'},{type:'subagent',index:0,name:'critico'}]},
  {name:'autor',desc:'Escreve livros: escritor + gramatical + critico + workspace. Loop de correções. Gera livro1.md.',icon:'📚',serverIndex:null,skillIndex:null,agentIndex:1,subAgentIndices:[1,2],mcpIndices:[],mode:'pipeline',systemPrompt:`Você é o orquestrador "Autor", responsável por escrever livros completos em português brasileiro.

## Fluxo de trabalho
1) Peça ao usuário o tema, gênero, estilo (culta/informal/mista) e número de capítulos;
2) Crie a estrutura do livro (título, sumário, resumo de cada capítulo);
3) Para CADA capítulo, entre em LOOP de correção até o texto estar impecável:

### LOOP por capítulo (repetir até aprovação):
   a) FASE 1 — ESCRITA: Use o agente "escritor" para escrever o conteúdo do capítulo (mínimo 500 palavras);
   b) FASE 2 — GRAMÁTICA: Envie CADA parágrafo para /gramatical corrigir;
      - Se /gramatical encontrar erros → aplique as correções → reenvie para /gramatical verificar;
      - Repita até /gramatical aprovar (sem erros encontrados);
   c) FASE 3 — REVISÃO: Envie o capítulo completo para /critico analisar;
      - Se /critico der nota abaixo de 7/10 ou apontar problemas → VOLTE para FASE 1 reescreva as partes problemáticas → repita FASE 2 e 3;
      - Se /critico aprovar (nota 7+ e sem problemas críticos) → prossiga;
   d) FASE 4 — SALVAR: Salve o capítulo no workspace via workspace_create com caminho "livro1/capitulo_X.md";
   e) Avance para o próximo capítulo;

4) Ao final de todos os capítulos:
   a) Crie "livro1/indice.md" com sumário e links para cada capítulo;
   b) Faça uma revisão final geral: envie todos os capítulos para /critico de uma vez;
   c) Se /critico apontar problemas gerais → corrija nos capítulos afetados → salve novamente;
   d) Apresente ao usuário o livro completo com estatísticas (total de palavras, capítulos, etc.);

## Regras do loop
- O loop de correção por capítulo tem no MÁXIMO 3 ciclos completos (escrita→gramatical→critico);
- Se após 3 ciclos /critico ainda apontar problemas, salve a melhor versão e avance, informando ao usuário;
- Se /gramatical aprovar sem erros, pule direto para /critico;
- Se /critico aprovar com nota 8+, pule a reescrita e salve direto;
- NUNCA salve um capítulo sem passar por /gramatical ao menos 1 vez;
- NUNCA salve um capítulo sem passar por /critico ao menos 1 vez;
- Salve TODO o conteúdo no workspace via workspace_create;
- Se o usuário pedir Continuar, retome de onde parou;
- Use /pesquisador quando precisar validar dados históricos, geográficos ou técnicos;
- Ao final, apresente um resumo do loop: quantos ciclos cada capítulo precisou.`,temperature:0.7,maxTokens:32768,topP:0.85,maxMsgs:30,steps:[
    {type:'prompt',text:'Apresente-se e peça ao usuário: tema, gênero, estilo (culta/informal/mista) e número de capítulos do livro.'},
    {type:'agent',index:1,name:'escritor'},
    {type:'subagent',index:1,name:'gramatical'},
    {type:'subagent',index:2,name:'critico'},
    {type:'mcp',index:null,name:'workspace_create'}
  ]}
];
if(!orchestrators.length){orchestrators=DEFAULT_ORCHESTRATORS;localStorage.setItem('llama_orchestrators',JSON.stringify(orchestrators));}
else{
  const defaultsToAdd=DEFAULT_ORCHESTRATORS.filter(d=>!orchestrators.find(o=>o.name===d.name));
  if(defaultsToAdd.length){orchestrators=orchestrators.concat(defaultsToAdd);localStorage.setItem('llama_orchestrators',JSON.stringify(orchestrators));}
}

// ===== TOKEN STATS =====
let stats=JSON.parse(localStorage.getItem('llama_stats')||'{"inputTokens":0,"outputTokens":0,"totalTime":0,"requests":0}');
function updateStatsDisplay(){
  document.getElementById('statInputTokens').textContent=formatNumber(stats.inputTokens);
  document.getElementById('statOutputTokens').textContent=formatNumber(stats.outputTokens);
  document.getElementById('statTotalTokens').textContent=formatNumber(stats.inputTokens+stats.outputTokens);
  const avg=stats.totalTime>0?(stats.outputTokens/stats.totalTime).toFixed(1):'0';
  document.getElementById('statAvgSpeed').textContent=`${avg} tok/s`;
  document.getElementById('statRequests').textContent=stats.requests;
}
function addStats(i,o,t){stats.inputTokens+=i;stats.outputTokens+=o;stats.totalTime+=t;stats.requests++;localStorage.setItem('llama_stats',JSON.stringify(stats));updateStatsDisplay();}
function resetStats(){if(!confirm('Resetar estatísticas?'))return;stats={inputTokens:0,outputTokens:0,totalTime:0,requests:0};localStorage.setItem('llama_stats',JSON.stringify(stats));updateStatsDisplay();}
function formatNumber(n){if(n>=1000000)return(n/1000000).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'k';return n.toString();}
updateStatsDisplay();

// ===== WCURL BUILT-IN COM PROXY CORS =====
const IMPORT_CATS=[['servers','🖥 Servidores'],['conversations','💬 Conversas'],['agents','🧠 Agentes'],['subAgents','🤖 Sub-Agentes'],['skills','⚡ Skills'],['mcps','🔧 Ferramentas (MCP)'],['orchestrators','🎼 Orquestradores']];
function catStore(){return{servers,conversations,agents,subAgents,skills,mcps,orchestrators};}
function catStorageKey(cat){return{servers:'llama_servers',conversations:'llama_convs',agents:'llama_agents',subAgents:'llama_subagents',skills:'llama_skills',mcps:'llama_mcps',orchestrators:'llama_orchestrators'}[cat];}
function renderAllSections(){renderServers();renderConversations();renderSkills();renderAgents();renderSubAgents();renderMCPs();renderOrchestrators();}
function openExportModal(){document.getElementById('exportCatButtons').innerHTML=IMPORT_CATS.map(([cat,label])=>`<button class="btn small" onclick="exportCat('${cat}')">${label}</button>`).join('');openModal('modalExport');}
function openImportModal(){document.getElementById('importCatButtons').innerHTML=IMPORT_CATS.map(([cat,label])=>`<button class="btn small" onclick="importCat('${cat}')">${label}</button>`).join('');openModal('modalImport');}
function downloadJSON(data,filename){const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;a.click();}
function exportCat(cat){downloadJSON({[cat]:catStore()[cat]},`${cat}-export.json`);closeModal('modalExport');}
let importTarget=null;
function importCat(cat){importTarget=cat;document.getElementById('importCatFile').click();}
async function handleImportCat(event){
  const file=event.target.files[0];
  const cat=importTarget;importTarget=null;
  if(!file||!cat)return;
  let data;
  try{data=JSON.parse(await file.text());}catch(e){alert('✗ JSON inválido.');event.target.value='';return;}
  let items=Array.isArray(data)?data:data[cat];
  if(cat==='mcps'&&data.mcp&&!items)items=Object.entries(data.mcp).map(([name,v])=>({name,...v}));
  if(!Array.isArray(items)){alert(`✗ Arquivo sem dados de "${cat}".`);event.target.value='';return;}
  const store=catStore();
  const replace=confirm(`${items.length} item(ns) encontrado(s) em "${cat}".\n\nOK = SUBSTITUIR os ${store[cat].length} atuais\nCancelar = ADICIONAR aos existentes`);
  store[cat]=replace?items:store[cat].concat(items);
  localStorage.setItem(catStorageKey(cat),JSON.stringify(store[cat]));
  renderAllSections();
  closeModal('modalImport');
  alert(`✓ ${items.length} item(ns) importado(s) para "${cat}".`);
  event.target.value='';
}
const WCURL_ID='__wcurl_builtin__';
let wcurlEnabled=JSON.parse(localStorage.getItem('wcurl_enabled')??'true');
let wcurlProxy=localStorage.getItem('wcurl_proxy')||'auto'; // 'auto','direct','custom'
let wcurlCustomProxy=localStorage.getItem('wcurl_custom_proxy')||'';

// ===== WCALC BUILT-IN (matemática segura) =====
const WCALC_ID='__wcalc_builtin__';
let wcalcEnabled=JSON.parse(localStorage.getItem('wcalc_enabled')??'true');
const WCALC_CONSTANTS={pi:Math.PI,e:Math.E,tau:Math.PI*2};
const WCALC_FUNCS={
  sqrt:Math.sqrt,cbrt:Math.cbrt,abs:Math.abs,sign:Math.sign,
  round:Math.round,floor:Math.floor,ceil:Math.ceil,trunc:Math.trunc,
  exp:Math.exp,log:Math.log,ln:Math.log,log10:Math.log10,log2:Math.log2,
  sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,
  sinh:Math.sinh,cosh:Math.cosh,tanh:Math.tanh
};
function wcalcTokenize(expr){
  const tokens=[];
  let rest=expr;
  const numRe=/^(\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
  const idRe=/^([a-zA-Z_][a-zA-Z0-9_]*)/;
  const opRe=/^([+\-*/%^(),])/;
  while(rest.length){
    if(/^\s/.test(rest)){rest=rest.replace(/^\s+/,'');continue;}
    let m=rest.match(numRe);
    if(m){tokens.push({type:'num',value:parseFloat(m[0])});rest=rest.slice(m[0].length);continue;}
    m=rest.match(idRe);
    if(m){tokens.push({type:'id',value:m[1]});rest=rest.slice(m[0].length);continue;}
    m=rest.match(opRe);
    if(m){tokens.push({type:'op',value:m[1]});rest=rest.slice(m[0].length);continue;}
    throw new Error(`Caractere inesperado: "${rest[0]}" em "${expr}"`);
  }
  return tokens;
}
function wcalcEval(expr){
  const tokens=wcalcTokenize(expr);
  if(!tokens.length)throw new Error('Expressão vazia');
  let pos=0;
  const peek=()=>tokens[pos]||null;
  function consume(v){const t=tokens[pos];if(!t)throw new Error(`Fim inesperado em "${expr}"`);if(v!==undefined&&t.value!==v)throw new Error(`Esperava "${v}" em "${expr}"`);pos++;return t;}
  function parseExpr(){
    let left=parseTerm();
    while(peek()&&(peek().value==='+'||peek().value==='-')){
      const op=consume().value;const right=parseTerm();
      left=op==='+'?left+right:left-right;
    }
    return left;
  }
  function parseTerm(){
    let left=parseFactor();
    while(peek()&&(peek().value==='*'||peek().value==='/'||peek().value==='%')){
      const op=consume().value;const right=parseFactor();
      if(op==='*')left=left*right;
      else if(op==='/'){if(right===0)throw new Error('Divisão por zero');left=left/right;}
      else{if(right===0)throw new Error('Módulo por zero');left=left%right;}
    }
    return left;
  }
  function parseFactor(){
    const t=peek();
    if(t&&t.value==='-'){consume();return -parseFactor();}
    if(t&&t.value==='+'){consume();return parseFactor();}
    const base=parseAtom();
    if(peek()&&peek().value==='^'){
      consume();
      const exp=parseFactor();
      return Math.pow(base,exp);
    }
    return base;
  }
  function parseAtom(){
    const t=consume();
    if(t.type==='num')return t.value;
    if(t.type==='id'){
      if(peek()&&peek().value==='('){
        consume('(');
        const args=[];
        if(peek()&&peek().value!==')'){args.push(parseExpr());while(peek()&&peek().value===','){consume();args.push(parseExpr());}}
        consume(')');
        return wcalcCall(t.value,args);
      }
      if(t.value in WCALC_CONSTANTS)return WCALC_CONSTANTS[t.value];
      throw new Error(`Constante ou função desconhecida: "${t.value}"`);
    }
    if(t.value==='('){const v=parseExpr();consume(')');return v;}
    throw new Error(`Token inesperado: "${t.value}"`);
  }
  const result=parseExpr();
  if(pos!==tokens.length)throw new Error('Expressão inválida');
  return result;
}
function wcalcCall(name,args){
  const n=args.length;
  if(name==='pow'){if(n!==2)throw new Error('pow requer 2 args');return Math.pow(args[0],args[1]);}
  if(name==='min'){if(n<1)throw new Error('min requer ao menos 1 arg');return Math.min(...args);}
  if(name==='max'){if(n<1)throw new Error('max requer ao menos 1 arg');return Math.max(...args);}
  if(name==='gcd'){if(n<1)throw new Error('gcd requer ao menos 1 arg');let g=Math.abs(Math.round(args[0]));for(let i=1;i<n;i++){let b=Math.abs(Math.round(args[i]));while(b){const tmp=b;b=g%b;g=tmp;}}return g;}
  if(name==='fact'){const k=Math.round(args[0]);if(k<0||k>170)throw new Error('fact: número deve estar entre 0 e 170');let r=1;for(let i=2;i<=k;i++)r*=i;return r;}
  if(name==='hypot'){if(n<1)throw new Error('hypot requer ao menos 1 arg');return Math.hypot(...args);}
  if(name==='atan2'){if(n!==2)throw new Error('atan2 requer 2 args');return Math.atan2(args[0],args[1]);}
  const fn=WCALC_FUNCS[name];
  if(!fn)throw new Error(`Função desconhecida: "${name}"`);
  if(n!==1)throw new Error(`${name} requer 1 argumento`);
  return fn(args[0]);
}
function wcalcFormatResult(v){
  if(typeof v!=='number'||!isFinite(v))throw new Error('Resultado não é um número finito');
  if(Number.isInteger(v)&&Math.abs(v)<1e15)return String(v);
  const num=parseFloat(v.toPrecision(12));
  if(Number.isInteger(num)&&Math.abs(num)<1e15)return String(num);
  return String(num);
}
const WCALC_TOOLS=[
  {type:'function',function:{name:'wcalc',description:'Avalia uma expressão matemática arbitrária com segurança (sem eval). Suporta + - * / % ^, parênteses, constantes (pi, e, tau) e funções (sqrt, cbrt, abs, round, floor, ceil, pow, exp, log/ln, log10, log2, sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, min, max, gcd, fact, hypot, atan2). Ex.: "2*pi*7", "sin(pi/2)^2+cos(pi/2)^2", "(2^10-1)/7", "sqrt(2)", "gcd(48,18)", "fact(5)".',parameters:{type:'object',properties:{expression:{type:'string',description:'Expressão matemática a calcular'}},required:['expression']}}},
  {type:'function',function:{name:'wcalc_stats',description:'Calcula estatísticas descritivas de uma lista de números: quantidade, soma, média, mediana, mínimo, máximo, variância e desvio padrão.',parameters:{type:'object',properties:{numbers:{type:'array',items:{type:'number'},description:'Lista de números'}},required:['numbers']}}},
  {type:'function',function:{name:'wcalc_percent',description:'Calcula porcentagens: {value,percent} retorna "percent% de value"; {from,to} retorna a variação percentual entre dois valores.',parameters:{type:'object',properties:{value:{type:'number',description:'Valor base (para calcular X% dele)'},percent:{type:'number',description:'Percentual a aplicar sobre value'},from:{type:'number',description:'Valor inicial (para variação percentual)'},to:{type:'number',description:'Valor final (para variação percentual)'}},required:[]}}}
];
async function executeWcalc(toolName,args){
  switch(toolName){
    case 'wcalc':return await wcalcExpression(args);
    case 'wcalc_stats':return await wcalcStats(args);
    case 'wcalc_percent':return await wcalcPercent(args);
    default:throw new Error(`Tool desconhecida: ${toolName}`);
  }
}
async function wcalcExpression(args){
  const expr=(args.expression||args.expr||'').toString().trim();
  if(!expr)throw new Error('Expressão obrigatória');
  const result=wcalcEval(expr);
  return `${expr} = ${wcalcFormatResult(result)}`;
}
async function wcalcStats(args){
  let raw=args.numbers;
  if(typeof raw==='string')raw=raw.split(/[,\s\n]+/).map(s=>s.trim()).filter(Boolean);
  const nums=Array.isArray(raw)?raw.map(Number).filter(n=>Number.isFinite(n)):[];
  if(!nums.length)throw new Error('Lista vazia ou inválida');
  const n=nums.length;
  const sum=nums.reduce((a,b)=>a+b,0);
  const mean=sum/n;
  const sorted=[...nums].sort((a,b)=>a-b);
  const median=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;
  const variance=nums.reduce((a,b)=>a+(b-mean)**2,0)/n;
  return JSON.stringify({n,sum,mean,median,min:sorted[0],max:sorted[n-1],variance,stddev:Math.sqrt(variance)},null,2);
}
async function wcalcPercent(args){
  if(args.percent!==undefined&&args.value!==undefined){
    return `${args.percent}% de ${args.value} = ${wcalcFormatResult(args.value*args.percent/100)}`;
  }
  if(args.from!==undefined&&args.to!==undefined){
    if(args.from===0)throw new Error('from não pode ser 0 na variação percentual');
    const ch=((args.to-args.from)/Math.abs(args.from))*100;
    return `Variação ${args.from} → ${args.to} = ${ch>=0?'+':''}${wcalcFormatResult(ch)}%`;
  }
  throw new Error('Use {value,percent} (percentual de um valor) ou {from,to} (variação percentual).');
}
function toggleWcalc(){wcalcEnabled=!wcalcEnabled;localStorage.setItem('wcalc_enabled',JSON.stringify(wcalcEnabled));renderMCPs();}

// ===== WTIME BUILT-IN (data e hora) =====
const WTIME_ID='__wtime_builtin__';
let wtimeEnabled=JSON.parse(localStorage.getItem('wtime_enabled')??'true');

const WT_DIAS=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const WT_MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function wtParse(v){
  if(v===undefined||v===null||v==='')return new Date();
  if(typeof v==='number'&&Number.isFinite(v))return new Date(v<1e12?v*1000:v);
  const s=String(v).trim();
  let d=new Date(s);
  if(isNaN(d.getTime())){const n=Number(s);if(Number.isFinite(n)&&n>0)d=new Date(n<1e12?n*1000:n);}
  if(isNaN(d.getTime()))throw new Error(`Data inválida: "${v}" (use ISO 8601, ex.: "2026-08-23", "2026-08-23T14:30:00Z")`);
  return d;
}
function wtFmtDuration(ms){
  const neg=ms<0;ms=Math.abs(ms);
  const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);
  const parts=[];
  if(d)parts.push(`${d} dia${d!==1?'s':''}`);
  if(h)parts.push(`${h} hora${h!==1?'s':''}`);
  if(m)parts.push(`${m} minuto${m!==1?'s':''}`);
  if(s||!parts.length)parts.push(`${s} segundo${s!==1?'s':''}`);
  return(neg?'-':'')+parts.join(', ');
}
function wtISOWeek(d){
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day=t.getUTCDay()||7;
  t.setUTCDate(t.getUTCDate()+4-day);
  const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));
  return Math.ceil(((t-y0)/86400000+1)/7);
}
function wtLocalStr(d,tz){
  const opts={dateStyle:'full',timeStyle:'long'};
  if(tz)opts.timeZone=tz;
  return new Intl.DateTimeFormat('pt-BR',opts).format(d);
}

const WTIME_TOOLS=[
  {type:'function',function:{name:'wtime_now',description:'Retorna a data e hora atuais. Suporta fuso horário IANA (ex.: "America/Sao_Paulo", "Europe/Lisbon"). Retorna ISO 8601, timestamp Unix, texto legível em português e partes separadas.',parameters:{type:'object',properties:{timezone:{type:'string',description:'Fuso horário IANA opcional (padrão: local do navegador)'}},required:[]}}},
  {type:'function',function:{name:'wtime_add',description:'Soma ou subtrai uma duração de uma data. Use valores negativos para subtrair. Aceita anos, meses, dias, horas, minutos, segundos e milissegundos.',parameters:{type:'object',properties:{datetime:{type:'string',description:'Data base em ISO 8601 (omitir/vazio = agora)'},years:{type:'number'},months:{type:'number'},days:{type:'number'},hours:{type:'number'},minutes:{type:'number'},seconds:{type:'number'},milliseconds:{type:'number'}},required:[]}}},
  {type:'function',function:{name:'wtime_diff',description:'Calcula a diferença entre duas datas, com duração legível, totais em dias/horas/minutos/segundos e contagem de dias úteis.',parameters:{type:'object',properties:{from:{type:'string',description:'Data inicial ISO 8601 (omitir = agora)'},to:{type:'string',description:'Data final ISO 8601 (obrigatória)'}},required:['to']}}},
  {type:'function',function:{name:'wtime_info',description:'Retorna detalhes de uma data: dia da semana, dia do ano, semana ISO, trimestre, ano bissexto, dias no mês e offset do fuso.',parameters:{type:'object',properties:{datetime:{type:'string',description:'Data em ISO 8601 (omitir/vazio = agora)'}},required:[]}}}
];

async function executeWtime(toolName,args){
  switch(toolName){
    case 'wtime_now':return await wtimeNow(args);
    case 'wtime_add':return await wtimeAdd(args);
    case 'wtime_diff':return await wtimeDiff(args);
    case 'wtime_info':return await wtimeInfo(args);
    default:throw new Error(`Tool desconhecida: ${toolName}`);
  }
}

async function wtimeNow(args){
  const tz=(args.timezone||'').toString().trim();
  const now=new Date();
  const out={iso:now.toISOString(),unix:Math.floor(now.getTime()/1000)};
  if(tz){
    try{new Intl.DateTimeFormat('en-US',{timeZone:tz});}
    catch(e){throw new Error(`Timezone inválido: "${tz}" (ex.: "America/Sao_Paulo", "Europe/Lisbon", "Asia/Tokyo")`);}
    out.timezone=tz;
    out.parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,+p.value]));
    const wdMap={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
    out.dia_semana=WT_DIAS[wdMap[new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'short'}).formatToParts(now)[0].value]];
  }
  out.local=wtLocalStr(now,tz||undefined);
  return JSON.stringify(out,null,2);
}

async function wtimeAdd(args){
  const base=wtParse(args.datetime);
  const num=k=>Number.isFinite(+args[k])?+args[k]:0;
  const r=new Date(base);
  r.setFullYear(r.getFullYear()+num('years'));
  r.setMonth(r.getMonth()+num('months'));
  r.setDate(r.getDate()+num('days'));
  r.setHours(r.getHours()+num('hours'));
  r.setMinutes(r.getMinutes()+num('minutes'));
  r.setSeconds(r.getSeconds()+num('seconds'));
  r.setMilliseconds(r.getMilliseconds()+num('milliseconds'));
  return JSON.stringify({base:base.toISOString(),result:r.toISOString(),unix:Math.floor(r.getTime()/1000),local:wtLocalStr(r),delta:wtFmtDuration(r.getTime()-base.getTime())},null,2);
}

async function wtimeDiff(args){
  if(!args.to)throw new Error('Parâmetro obrigatório: "to"');
  const a=wtParse(args.from),b=wtParse(args.to);
  const ms=b.getTime()-a.getTime(),abs=Math.abs(ms);
  let biz=0;
  const cur=new Date(Math.min(a.getTime(),b.getTime()));
  cur.setHours(12,0,0,0);
  const end=new Date(Math.max(a.getTime(),b.getTime()));
  end.setHours(12,0,0,0);
  while(cur<=end){const wd=cur.getDay();if(wd!==0&&wd!==6)biz++;cur.setDate(cur.getDate()+1);}
  if(biz&&abs>=86400000)biz--;
  return JSON.stringify({from:a.toISOString(),to:b.toISOString(),direction:ms>=0?'to é depois de from':'to é antes de from',duration:wtFmtDuration(ms),dias_totais:Math.floor(abs/86400000),horas_totais:Math.floor(abs/3600000),minutos_totais:Math.floor(abs/60000),segundos_totais:Math.floor(abs/1000),dias_uteis:biz},null,2);
}

async function wtimeInfo(args){
  const d=wtParse(args.datetime);
  const y=d.getFullYear(),m=d.getMonth();
  const doy=Math.floor((d-new Date(y,0,1))/86400000)+1;
  const leap=(y%4===0&&y%100!==0)||y%400===0;
  return JSON.stringify({iso:d.toISOString(),unix:Math.floor(d.getTime()/1000),local:wtLocalStr(d),data:`${d.getDate()} de ${WT_MESES[m]} de ${y}`,dia_semana:WT_DIAS[d.getDay()],dia_do_ano:doy,semana_iso:wtISOWeek(d),trimestre:Math.floor(m/3)+1,bissexto:leap,dias_no_mes:new Date(y,m+1,0).getDate(),fuso_offset_minutos:-d.getTimezoneOffset()},null,2);
}
function toggleWtime(){wtimeEnabled=!wtimeEnabled;localStorage.setItem('wtime_enabled',JSON.stringify(wtimeEnabled));renderMCPs();}

// ===== WEDITOR BUILT-IN (opera no workspace do PHP) =====
const WEDITOR_ID='__weditor_builtin__';
let weditorEnabled=JSON.parse(localStorage.getItem('weditor_enabled')??'true');
let weditorUrl=localStorage.getItem('weditor_url')||'';
function toggleWeditor(){weditorEnabled=!weditorEnabled;localStorage.setItem('weditor_enabled',JSON.stringify(weditorEnabled));renderMCPs();}
function weditorBaseUrl(){
  if(weditorUrl)return weditorUrl;
  const path=location.pathname||'';
  if(/\.php(\/|$)/.test(path))return location.protocol+'//'+location.host+path;
  const dir=path.substring(0,path.lastIndexOf('/')+1)||'/';
  return location.protocol+'//'+location.host+dir;
}
function openWeditorConfig(){
  const u=prompt('URL do servidor PHP com as tools fs_* (ex.: http://localhost:8082, http://umruivo.xo.je, ou vazio = mesma origem do app)',weditorUrl||'');
  if(u===null)return;
  weditorUrl=u.trim();
  localStorage.setItem('weditor_url',weditorUrl);
  renderMCPs();
}
const WEDITOR_TOOLS=[
  {type:'function',function:{name:'weditor_list',description:'Lista o conteúdo de um diretório do workspace (arquivos e subdiretórios).',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho da pasta (vazio ou "/" = raiz).'}},required:[]}}},
  {type:'function',function:{name:'weditor_read',description:'Lê o conteúdo de um arquivo do workspace.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho do arquivo.'},max_chars:{type:'number',description:'Máx. caracteres (padrão: 20000).'}},required:['path']}}},
  {type:'function',function:{name:'weditor_create',description:'Cria ou sobrescreve um arquivo no workspace. Cria diretórios automaticamente.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho do arquivo.'},content:{type:'string',description:'Conteúdo do arquivo.'}},required:['path','content']}}},
  {type:'function',function:{name:'weditor_write',description:'Alias de weditor_create. Cria ou sobrescreve um arquivo.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho do arquivo.'},content:{type:'string',description:'Conteúdo do arquivo.'}},required:['path','content']}}},
  {type:'function',function:{name:'weditor_mkdir',description:'Cria um diretório no workspace.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho do diretório.'},recursive:{type:'boolean',description:'Criar pais automaticamente (padrão: true).'}},required:['path']}}},
  {type:'function',function:{name:'weditor_delete',description:'Exclui um arquivo ou diretório do workspace.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho do arquivo/diretório.'},recursive:{type:'boolean',description:'Remover diretório recursivamente (padrão: true).'}},required:['path']}}},
  {type:'function',function:{name:'weditor_rename',description:'Renomeia ou move um arquivo/diretório.',parameters:{type:'object',properties:{source:{type:'string',description:'Caminho atual.'},target:{type:'string',description:'Novo caminho.'}},required:['source','target']}}},
  {type:'function',function:{name:'weditor_copy',description:'Copia um arquivo ou diretório.',parameters:{type:'object',properties:{source:{type:'string',description:'Origem.'},target:{type:'string',description:'Destino.'}},required:['source','target']}}},
  {type:'function',function:{name:'weditor_exists',description:'Verifica se um caminho existe e retorna o tipo.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho.'}},required:['path']}}},
  {type:'function',function:{name:'weditor_stat',description:'Informações detalhadas de um arquivo/diretório.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho.'}},required:['path']}}},
  {type:'function',function:{name:'weditor_tree',description:'Lista recursiva de um diretório em árvore.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho da pasta.'},depth:{type:'number',description:'Profundidade máxima (padrão: 3, máx: 5).'}},required:[]}}},
  {type:'function',function:{name:'weditor_search',description:'Busca arquivos por nome (glob) no workspace.',parameters:{type:'object',properties:{pattern:{type:'string',description:'Padrão de nome (glob, ex.: *.php, index.*).'},root:{type:'string',description:'Diretório onde buscar (padrão: raiz).'},recursive:{type:'boolean',description:'Buscar em subdiretórios (padrão: true).'}},required:['pattern']}}},
];
async function executeWeditor(toolName,args){
  const base=weditorBaseUrl().replace(/\/+$/,'');
  const shortName=toolName.replace('weditor_','');
  const nameMap={create:'write'};
  const fsName='fs_'+(nameMap[shortName]||shortName);
  const body={method:'tools/call',params:{name:fsName,arguments:args},jsonrpc:'2.0',id:Date.now()};
  const isPhpFile=/\.php(\/|$)/.test(base);
  const endpoints=isPhpFile
    ?[{url:base,body}]
    :[{url:base+'/tools/call',body:{name:fsName,arguments:args}},{url:base,body}];
  for(const ep of endpoints){
    try{
      const res=await fetch(ep.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ep.body),signal:AbortSignal.timeout(30000)});
      if(!res.ok)continue;
      const data=await res.json();
      const txt=data.result?.content?.[0]?.text||data.result||data.content?.[0]?.text||JSON.stringify(data);
      return txt;
    }catch(e){}
  }
  throw new Error(`Falha ao executar "${toolName}" no servidor.`);
}

// ===== MICRO-MCP BUILT-IN (include automático de micro-mcp/*.php via lama.php) =====
const MMCP_ID='__micro_mcp_builtin__';
let mmcpEnabled=JSON.parse(localStorage.getItem('mmcp_enabled')??'true');
let mmcpToolsCache=[];
function mmcpBaseUrl(){return weditorBaseUrl().replace(/\/+$/,'');}
async function refreshMicroMCPTools(){
  try{
    const base=mmcpBaseUrl();
    const isPhpFile=/\.php(\/|$)/.test(base);
    const body={method:'tools/list',jsonrpc:'2.0',id:Date.now()};
    const endpoints=isPhpFile
      ?[{url:base,body}]
      :[{url:base+'/tools/list',method:'POST',body:{}},{url:base+'/tools',method:'GET',body:null},{url:base,body}];
    let tools=null;
    for(const ep of endpoints){
      try{
        const opts={method:ep.method||'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(8000)};
        if(ep.body)opts.body=JSON.stringify(ep.body);
        const res=await fetch(ep.url,opts);if(!res.ok)continue;
        const data=await res.json();
        if(data.result?.tools)tools=data.result.tools;
        else if(Array.isArray(data.tools))tools=data.tools;
        if(tools&&tools.length)break;
      }catch(e){}
    }
    if(!Array.isArray(tools))return;
    mmcpToolsCache=tools
      .filter(t=>t&&typeof t.name==='string'&&t.name.length>0&&!t.name.startsWith('fs_')&&!t.name.startsWith('weditor_'))
      .map(t=>({type:'function',function:{name:t.name,description:t.description||'',parameters:t.inputSchema||t.parameters||{type:'object',properties:{}}},_mcpIndex:MMCP_ID}));
    renderMCPs();
  }catch(e){}
}
function toggleMicroMCP(){mmcpEnabled=!mmcpEnabled;localStorage.setItem('mmcp_enabled',JSON.stringify(mmcpEnabled));renderMCPs();}
async function executeMicroMCP(toolName,args){
  const base=mmcpBaseUrl();
  const body={method:'tools/call',params:{name:toolName,arguments:args},jsonrpc:'2.0',id:Date.now()};
  const isPhpFile=/\.php(\/|$)/.test(base);
  const endpoints=isPhpFile
    ?[{url:base,body}]
    :[{url:base+'/tools/call',body:{name:toolName,arguments:args}},{url:base,body}];
  for(const ep of endpoints){
    try{
      const res=await fetch(ep.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ep.body),signal:AbortSignal.timeout(30000)});
      if(!res.ok)continue;
      const data=await res.json();
      const txt=data.result?.content?.[0]?.text||data.result||data.content?.[0]?.text||JSON.stringify(data);
      return txt;
    }catch(e){}
  }
  throw new Error(`Falha ao executar "${toolName}"`);
}

// ===== GESTÃO DE MICRO-MCP (criar/editar/excluir micro-mcp/*.php) =====
let microMCPEntries=[];
function microMCPBase(){return mmcpBaseUrl();}
function openMicroMCPManager(){openModal('modalMicroMCP');microMCPRefresh();}
async function microMCPRefresh(){
  const list=document.getElementById('microMCPList');
  if(!list)return;
  list.innerHTML='<div class="ws-empty">Carregando…</div>';
  try{
    const res=await fetch(microMCPBase()+'?action=micro_list',{signal:AbortSignal.timeout(8000)});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    microMCPEntries=Array.isArray(data.files)?data.files:[];
    if(!microMCPEntries.length){list.innerHTML='<div class="ws-empty">Nenhum micro-MCP. Clique em "+ Novo micro-MCP".</div>';return;}
    list.innerHTML=microMCPEntries.map(f=>{
      const toolsTxt=f.tools?` · 🔧 ${f.tools} tools`:'';
      const idTxt=f.id?` · id: ${f.id}`:'';
      const on=f.enabled!==false;
      return `<div class="ws-item" style="display:flex;align-items:center;gap:6px;padding:6px;border-bottom:1px solid #ddd;${on?'':'opacity:.55'}"><button class="btn small" onclick="microMCPToggle('${f.file}')" title="${on?'Desativar':'Ativar'}">${on?'✅':'⬜'}</button><span style="flex:1;overflow:hidden;text-overflow:ellipsis"><strong>${f.file}</strong>${idTxt}${toolsTxt}<br><small>${f.description||f.name||''}</small></span><button class="btn small" onclick="microMCPEdit('${f.file}')">✏️</button><button class="btn small" onclick="microMCPDelete('${f.file}')">🗑</button></div>`;
    }).join('');
  }catch(e){list.innerHTML='<div class="ws-empty">Erro: '+e.message+'</div>';}
}
function microMCPNew(){
  document.getElementById('microMCPEditorTitle').textContent='Novo micro-MCP';
  document.getElementById('microMCPFileName').value='mcp-novo.php';
  document.getElementById('microMCPFileName').disabled=false;
  document.getElementById('microMCPFileContent').value=MMCP_TEMPLATE;
  openModal('modalMicroMCPEditor');
}
async function microMCPEdit(file){
  try{
    const res=await fetch(microMCPBase()+'?action=micro_read&file='+encodeURIComponent(file),{signal:AbortSignal.timeout(8000)});
    if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||('HTTP '+res.status));}
    const data=await res.json();
    document.getElementById('microMCPEditorTitle').textContent='Editar micro-MCP';
    const nameInput=document.getElementById('microMCPFileName');
    nameInput.value=data.file;nameInput.disabled=true;
    document.getElementById('microMCPFileContent').value=data.content||'';
    openModal('modalMicroMCPEditor');
  }catch(e){alert('Erro ao ler: '+e.message);}
}
async function microMCPSave(){
  const file=document.getElementById('microMCPFileName').value.trim();
  const content=document.getElementById('microMCPFileContent').value;
  if(!file){alert('Informe o nome do arquivo (mcp-nome.php).');return;}
  if(!/^mcp-[a-z0-9_-]+\.php$/i.test(file)){alert('Nome inválido. Use o formato mcp-nome.php.');return;}
  try{
    const res=await fetch(microMCPBase()+'?action=micro_write',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file,content}),signal:AbortSignal.timeout(15000)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||('HTTP '+res.status));
    closeModal('modalMicroMCPEditor');
    await refreshMicroMCPTools();
    microMCPRefresh();
  }catch(e){alert('Erro ao salvar: '+e.message);}
}
async function microMCPDelete(file){
  if(!confirm(`Excluir o micro-MCP "${file}"? Esta ação não pode ser desfeita.`))return;
  try{
    const res=await fetch(microMCPBase()+'?action=micro_delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file}),signal:AbortSignal.timeout(8000)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||('HTTP '+res.status));
    await refreshMicroMCPTools();
    microMCPRefresh();
  }catch(e){alert('Erro ao excluir: '+e.message);}
}
async function microMCPToggle(file){
  try{
    const res=await fetch(microMCPBase()+'?action=micro_toggle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file}),signal:AbortSignal.timeout(8000)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||('HTTP '+res.status));
    await refreshMicroMCPTools();
    microMCPRefresh();
  }catch(e){alert('Erro ao alternar: '+e.message);}
}
const MMCP_TEMPLATE=`<?php\ndeclare(strict_types=1);\n\nreturn [\n    'id' => 'exemplo',\n    'name' => 'Exemplo',\n    'description' => 'Descrição do micro-MCP.',\n    'tools' => function (): array {\n        return [\n            ['name' => 'hello', 'description' => 'Diz olá.', 'inputSchema' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string', 'description' => 'Nome.']]]],\n        ];\n    },\n    'call' => function (string $name, array $args): string {\n        if ($name === 'hello') {\n            return json_encode(['hello' => $args['name'] ?? 'mundo']);\n        }\n        throw new Exception("Ferramenta desconhecida: $name");\n    },\n];\n`;

// ===== WORKSPACE BUILT-IN (arquivos no localStorage) =====
const WS_ID='__workspace_builtin__';
let workspaceEnabled=JSON.parse(localStorage.getItem('workspace_enabled')??'true');
const WS_KEY='llama_workspace_files';

function wsGetFiles(){try{return JSON.parse(localStorage.getItem(WS_KEY)||'{}');}catch(e){return {};}}
function wsSaveFiles(files){localStorage.setItem(WS_KEY,JSON.stringify(files));}
function wsNormalizePath(p){return p.replace(/\/+/g,'/').replace(/^\//,'').replace(/\/$/,'');}
function wsParentDir(p){const n=wsNormalizePath(p);const i=n.lastIndexOf('/');return i>0?n.substring(0,i):'';}
function wsFileType(name){const ext=name.includes('.')?name.split('.').pop().toLowerCase():'';return ext;}
function wsHumanSize(bytes){if(bytes<1024)return bytes+' B';if(bytes<1048576)return(bytes/1024).toFixed(1)+' KB';return(bytes/1048576).toFixed(1)+' MB';}

const WORKSPACE_TOOLS=[
  {type:'function',function:{name:'workspace_list',description:'Lista todos os arquivos e pastas do workspace. Retorna árvore de arquivos com tamanho e data de modificação.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho da pasta para listar (vazio = raiz)'}},required:[]}}},
  {type:'function',function:{name:'workspace_read',description:'Lê o conteúdo de um arquivo do workspace.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho completo do arquivo (ex: "src/index.html")'}},required:['path']}}},
  {type:'function',function:{name:'workspace_create',description:'Cria ou sobrescreve um arquivo no workspace. Cria pastas automaticamente.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho do arquivo (ex: "src/app.js")'},content:{type:'string',description:'Conteúdo do arquivo'}},required:['path','content']}}},
  {type:'function',function:{name:'workspace_update',description:'Atualiza o conteúdo de um arquivo existente. Suporta insert, replace e append.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho do arquivo'},content:{type:'string',description:'Novo conteúdo completo (substitui tudo)'},mode:{type:'string',enum:['overwrite','append','prepend','replace'],description:'Modo: overwrite (padrão), append, prepend, replace'},find:{type:'string',description:'Para mode=replace: texto a encontrar'},replace_with:{type:'string',description:'Para mode=replace: texto de substituição'}},required:['path','content']}}},
  {type:'function',function:{name:'workspace_delete',description:'Exclui um arquivo ou pasta do workspace. Pastas são excluídas recursivamente.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho do arquivo ou pasta a excluir'}},required:['path']}}},
  {type:'function',function:{name:'workspace_rename',description:'Renomeia ou move um arquivo/pasta no workspace.',parameters:{type:'object',properties:{old_path:{type:'string',description:'Caminho atual'},new_path:{type:'string',description:'Novo caminho'}},required:['old_path','new_path']}}},
  {type:'function',function:{name:'workspace_info',description:'Retorna informações detalhadas de um arquivo: tamanho, tipo, data de modificação, e primeiros caracteres.',parameters:{type:'object',properties:{path:{type:'string',description:'Caminho do arquivo'}},required:['path']}}},
  {type:'function',function:{name:'workspace_search',description:'Busca arquivos por nome ou conteúdo dentro do workspace.',parameters:{type:'object',properties:{query:{type:'string',description:'Texto a buscar (busca em nomes e conteúdos)'},in_content:{type:'boolean',description:'Se true, busca também dentro do conteúdo dos arquivos'}},required:['query']}}}
];

async function executeWorkspace(toolName,args){
  switch(toolName){
    case 'workspace_list':return wsList(args);
    case 'workspace_read':return wsRead(args);
    case 'workspace_create':return wsCreate(args);
    case 'workspace_update':return wsUpdate(args);
    case 'workspace_delete':return wsDelete(args);
    case 'workspace_rename':return wsRename(args);
    case 'workspace_info':return wsInfo(args);
    case 'workspace_search':return wsSearch(args);
    default:throw new Error(`Tool desconhecida: ${toolName}`);
  }
}

function wsList(args){
  const files=wsGetFiles();
  const filterPath=wsNormalizePath(args.path||'');
  const entries=[];
  for(const[fPath,fData]of Object.entries(files)){
    if(filterPath&&!fPath.startsWith(filterPath+'/')&&fPath!==filterPath)continue;
    entries.push({path:fPath,type:fData.type||'file',size:wsHumanSize((fData.content||'').length),modified:fData.modified||''});
  }
  if(!entries.length)return JSON.stringify({path:filterPath||'/',files:[],message:'Pasta vazia ou não encontrada.'},null,2);
  entries.sort((a,b)=>a.path.localeCompare(b.path));
  return JSON.stringify({path:filterPath||'/',count:entries.length,files:entries},null,2);
}

function wsRead(args){
  const p=wsNormalizePath(args.path);
  if(!p)throw new Error('Caminho obrigatório.');
  const files=wsGetFiles();
  if(!files[p])throw new Error(`Arquivo não encontrado: "${p}"`);
  return JSON.stringify({path:p,content:files[p].content,type:files[p].type,size:wsHumanSize((files[p].content||'').length),modified:files[p].modified},null,2);
}

function wsCreate(args){
  const p=wsNormalizePath(args.path);
  if(!p)throw new Error('Caminho obrigatório.');
  if(!args.content&&args.content!=='')throw new Error('Conteúdo obrigatório.');
  const files=wsGetFiles();
  const isNew=!files[p];
  files[p]={content:args.content,type:wsFileType(p.split('/').pop()),modified:new Date().toISOString()};
  wsSaveFiles(files);
  return JSON.stringify({action:isNew?'created':'overwritten',path:p,size:wsHumanSize(args.content.length)});
}

function wsUpdate(args){
  const p=wsNormalizePath(args.path);
  if(!p)throw new Error('Caminho obrigatório.');
  const files=wsGetFiles();
  if(!files[p])throw new Error(`Arquivo não encontrado: "${p}"`);
  const mode=args.mode||'overwrite';
  let newContent=args.content||'';
  if(mode==='append')newContent=files[p].content+args.content;
  else if(mode==='prepend')newContent=args.content+files[p].content;
  else if(mode==='replace'){
    if(!args.find)throw new Error('Campo "find" obrigatório para mode=replace.');
    if(!files[p].content.includes(args.find))throw new Error(`Texto não encontrado no arquivo.`);
    newContent=files[p].content.split(args.find).join(args.replace_with||'');
  }
  files[p].content=newContent;
  files[p].modified=new Date().toISOString();
  wsSaveFiles(files);
  return JSON.stringify({action:'updated',path:p,mode,size:wsHumanSize(newContent.length)});
}

function wsDelete(args){
  const p=wsNormalizePath(args.path);
  if(!p)throw new Error('Caminho obrigatório.');
  const files=wsGetFiles();
  let count=0;
  for(const key of Object.keys(files)){
    if(key===p||key.startsWith(p+'/')){delete files[key];count++;}
  }
  if(!count)throw new Error(`Não encontrado: "${p}"`);
  wsSaveFiles(files);
  return JSON.stringify({action:'deleted',path:p,items_removed:count});
}

function wsRename(args){
  const oldP=wsNormalizePath(args.old_path);
  const newP=wsNormalizePath(args.new_path);
  if(!oldP||!newP)throw new Error('Caminhos obrigatórios.');
  const files=wsGetFiles();
  if(!files[oldP]){
    const prefix=oldP+'/';
    const matching=Object.keys(files).filter(k=>k.startsWith(prefix));
    if(!matching.length)throw new Error(`Não encontrado: "${oldP}"`);
    for(const key of matching){
      const sub=key.substring(prefix.length);
      files[newP+'/'+sub]=files[key];
      delete files[key];
    }
    wsSaveFiles(files);
    return JSON.stringify({action:'moved',from:oldP,to:newP,items_moved:matching.length});
  }
  if(files[newP])throw new Error(`Já existe: "${newP}"`);
  files[newP]=files[oldP];
  delete files[oldP];
  wsSaveFiles(files);
  return JSON.stringify({action:'renamed',from:oldP,to:newP});
}

function wsInfo(args){
  const p=wsNormalizePath(args.path);
  if(!p)throw new Error('Caminho obrigatório.');
  const files=wsGetFiles();
  if(!files[p])throw new Error(`Arquivo não encontrado: "${p}"`);
  const f=files[p];
  return JSON.stringify({path:p,type:f.type||'file',size:(f.content||'').length,size_human:wsHumanSize((f.content||'').length),modified:f.modified,preview:(f.content||'').substring(0,500),lines:(f.content||'').split('\n').length},null,2);
}

function wsSearch(args){
  const q=(args.query||'').toLowerCase();
  if(!q)throw new Error('Query obrigatória.');
  const files=wsGetFiles();
  const results=[];
  for(const[fPath,fData]of Object.entries(files)){
    let match=false;
    if(fPath.toLowerCase().includes(q)){match=true;}
    else if(args.in_content&&fData.content&&fData.content.toLowerCase().includes(q)){match=true;}
    if(match)results.push({path:fPath,matched_in:fPath.toLowerCase().includes(q)?'name':'content',size:wsHumanSize((fData.content||'').length)});
  }
  return JSON.stringify({query:args.query,count:results.length,results},null,2);
}

function toggleWorkspace(){workspaceEnabled=!workspaceEnabled;localStorage.setItem('workspace_enabled',JSON.stringify(workspaceEnabled));renderMCPs();}

function openFileExplorer(){
  document.getElementById('wsExplorerContent').innerHTML='';
  document.getElementById('wsPreviewContent').innerHTML='<div class="ws-empty">Selecione um arquivo para visualizar</div>';
  document.getElementById('wsBreadcrumb').textContent='/';
  renderWorkspaceTree('');
  openModal('modalWorkspace');
}

function renderWorkspaceTree(filterPath){
  const files=wsGetFiles();
  const dirs=new Set();
  const fileEntries=[];
  const prefix=filterPath?filterPath+'/':'';
  for(const[fPath,fData]of Object.entries(files)){
    if(filterPath&&!fPath.startsWith(prefix)&&fPath!==filterPath)continue;
    const relative=filterPath?fPath.substring(prefix.length):fPath;
    if(!relative)continue;
    const parts=relative.split('/');
    if(parts.length>1){
      dirs.add(parts[0]);
    }else{
      fileEntries.push({path:fPath,name:parts[0],type:fData.type,size:(fData.content||'').length,modified:fData.modified});
    }
  }
  const container=document.getElementById('wsExplorerContent');
  let html='';
  if(filterPath){
    const parent=wsParentDir(filterPath);
    html+=`<div class="ws-item ws-dir" onclick="wsNavigate('${parent}')"><span class="ws-icon">📁</span><span class="ws-name">..</span><span class="ws-meta">Voltar</span></div>`;
  }
  for(const d of [...dirs].sort()){
    const fullPath=prefix?prefix+d:d;
    html+=`<div class="ws-item ws-dir" onclick="wsNavigate('${fullPath.replace(/'/g,"\\'")}')"><span class="ws-icon">📂</span><span class="ws-name">${escapeHtml(d)}</span></div>`;
  }
  for(const f of fileEntries.sort((a,b)=>a.name.localeCompare(b.name))){
    const icon=wsFileIcon(f.type);
    html+=`<div class="ws-item ws-file" onclick="wsPreviewFile('${f.path.replace(/'/g,"\\'")}')"><span class="ws-icon">${icon}</span><span class="ws-name">${escapeHtml(f.name)}</span><span class="ws-meta">${wsHumanSize(f.size)}</span><div class="ws-item-actions"><button class="btn small" onclick="event.stopPropagation();wsDownloadFile('${f.path.replace(/'/g,"\\'")}')" title="Download">⬇</button><button class="btn small ws-del-btn" onclick="event.stopPropagation();wsDeleteFile('${f.path.replace(/'/g,"\\'")}')" title="Excluir">🗑</button></div></div>`;
  }
  if(!html)html='<div class="ws-empty">Pasta vazia</div>';
  container.innerHTML=html;
  document.getElementById('wsBreadcrumb').textContent='/' + (filterPath||'');
}

function wsNavigate(path){renderWorkspaceTree(path);document.getElementById('wsPreviewContent').innerHTML='<div class="ws-empty">Selecione um arquivo para visualizar</div>';document.getElementById('wsBreadcrumb').textContent='/' + (path||'');}

function wsPreviewFile(path){
  const files=wsGetFiles();
  if(!files[path])return;
  const f=files[path];
  const isText=!f.type||['js','ts','jsx','tsx','json','html','htm','css','scss','less','md','txt','xml','yaml','yml','toml','ini','cfg','conf','py','rb','go','rs','java','c','cpp','h','hpp','sh','bash','sql','csv','vue','svelte','astro','php','pl','r','lua','swift','kt','dart','ex','exs','hs','clj','elm','zig','nim','d','tf','dockerfile','makefile','gitignore','env','log'].includes(f.type);
  const isHTML=['html','htm'].includes(f.type);
  const isImage=['png','jpg','jpeg','gif','webp','svg','bmp','ico'].includes(f.type);
  const isMedia=['mp3','wav','ogg','mp4','webm'].includes(f.type);
  const content=f.content||'';
  const lines=content.split('\n');
  const preview=lines.slice(0,200).join('\n');
  let html=`<div class="ws-preview-header"><strong>${escapeHtml(path.split('/').pop())}</strong><span class="ws-meta">${wsHumanSize(content.length)} · ${lines.length} linhas</span><div class="ws-preview-actions">`;
  if(isHTML)html+=`<button class="btn small ws-vis-btn" onclick="wsToggleRender('${path.replace(/'/g,"\\'")}')">👁 Visualizar</button>`;
  if(isImage)html+=`<button class="btn small ws-vis-btn" onclick="wsToggleImage('${path.replace(/'/g,"\\'")}')">👁 Visualizar</button>`;
  html+=`<button class="btn small" onclick="wsDownloadFile('${path.replace(/'/g,"\\'")}')">⬇ Download</button><button class="btn small" onclick="wsCopyContent('${path.replace(/'/g,"\\'")}')">📋 Copiar</button></div></div>`;
  if(isHTML){
    html+=`<div id="wsRenderArea"></div>`;
    html+=`<pre class="ws-preview-code"><code>${escapeHtml(preview)}</code></pre>`;
    if(lines.length>200)html+=`<div class="ws-meta" style="text-align:center;padding:6px">... +${lines.length-200} linhas</div>`;
  }else if(isImage){
    html+=`<div id="wsRenderArea"></div>`;
    html+=`<pre class="ws-preview-code"><code>${escapeHtml(preview)}</code></pre>`;
  }else if(isText){
    html+=`<pre class="ws-preview-code"><code>${escapeHtml(preview)}</code></pre>`;
    if(lines.length>200)html+=`<div class="ws-meta" style="text-align:center;padding:6px">... +${lines.length-200} linhas</div>`;
  }else{
    html+=`<div class="ws-preview-binary">Arquivo binário (${f.type}).<br>Tamanho: ${wsHumanSize(content.length)}</div>`;
  }
  document.getElementById('wsPreviewContent').innerHTML=html;
}

function wsToggleRender(path){
  const area=document.getElementById('wsRenderArea');
  if(!area)return;
  if(area.innerHTML){area.innerHTML='';return;}
  const files=wsGetFiles();
  if(!files[path])return;
  const blob=new Blob([files[path].content||''],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  area.innerHTML=`<iframe src="${url}" class="ws-iframe" sandbox="allow-scripts allow-same-origin"></iframe>`;
}

function wsToggleImage(path){
  const area=document.getElementById('wsRenderArea');
  if(!area)return;
  if(area.innerHTML){area.innerHTML='';return;}
  const files=wsGetFiles();
  if(!files[path])return;
  const content=files[path].content||'';
  const type=(files[path].type||'png').toLowerCase();
  const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',bmp:'image/bmp',ico:'image/x-icon'}[type]||'image/png';
  let src='';
  if(content.startsWith('data:')){src=content;}
  else if(content.startsWith('http')){src=content;}
  else if(type==='svg'){
    const blob=new Blob([content],{type:'image/svg+xml'});
    src=URL.createObjectURL(blob);
  }else if(content.trim().startsWith('<')){
    const blob=new Blob([content],{type:mime});
    src=URL.createObjectURL(blob);
  }else{
    src=`data:${mime};base64,${content}`;
  }
  area.innerHTML=`<div class="ws-img-wrap"><img src="${src}" class="ws-img-preview" onerror="this.parentElement.innerHTML='<div class=\\'ws-preview-binary\\'>Erro ao carregar. Verifique o conteúdo.</div>'"></div>`;
}

function wsFileIcon(type){
  const icons={js:'📜',ts:'📜',jsx:'⚛️',tsx:'⚛️',json:'📋',html:'🌐',htm:'🌐',css:'🎨',scss:'🎨',md:'📝',txt:'📄',py:'🐍',go:'🔷',rs:'🦀',java:'☕',sh:'🖥',sql:'🗃',svg:'🎨',vue:'💚',php:'🐘',rb:'💎',png:'🖼',jpg:'🖼',jpeg:'🖼',gif:'🖼',webp:'🖼',pdf:'📕',zip:'📦',gz:'📦'};
  return icons[type]||'📄';
}

function wsDownloadFile(path){
  const files=wsGetFiles();
  if(!files[path])return;
  const blob=new Blob([files[path].content||''],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=path.split('/').pop()||'file';
  a.click();
  URL.revokeObjectURL(a.href);
}

function wsCopyContent(path){
  const files=wsGetFiles();
  if(!files[path])return;
  navigator.clipboard.writeText(files[path].content||'').catch(()=>{});
}

function wsDeleteFile(path){
  if(!confirm(`Excluir "${path}"?`))return;
  const files=wsGetFiles();
  delete files[path];
  wsSaveFiles(files);
  const parent=wsParentDir(path);
  renderWorkspaceTree(parent);
  document.getElementById('wsPreviewContent').innerHTML='<div class="ws-empty">Arquivo excluído</div>';
}

// ===== WEDITOR FILE EXPLORER (workspace do servidor PHP) =====
let wePath='';
function weParentDir(p){const n=(p||'').replace(/\/+$/,'');const i=n.lastIndexOf('/');return i>0?n.substring(0,i):'';}
function weBasename(p){const n=(p||'').replace(/\/+$/,'');return n.split('/').pop()||n;}
async function weCall(fsName,args){
  const res=await executeWeditor('weditor_'+fsName,args);
  try{return JSON.parse(res);}catch(e){return res;}
}
function openWeditorExplorer(){
  document.getElementById('weExplorerContent').innerHTML='<div class="ws-empty">Carregando...</div>';
  document.getElementById('wePreviewContent').innerHTML='<div class="ws-empty">Selecione um arquivo para visualizar</div>';
  wePath='';
  renderWeditorTree('');
  openModal('modalWeditor');
}
async function renderWeditorTree(filterPath){
  wePath=filterPath||'';
  const container=document.getElementById('weExplorerContent');
  document.getElementById('weBreadcrumb').textContent='/' + (filterPath||'');
  let data;
  try{data=await weCall('list',{path:filterPath||''});}catch(e){container.innerHTML=`<div class="ws-empty" style="color:var(--error)">Erro: ${escapeHtml(e.message)}</div>`;return;}
  const entries=Array.isArray(data?.entries)?data.entries:[];
  let html='';
  if(filterPath){
    const parent=weParentDir(filterPath);
    html+=`<div class="ws-item ws-dir" onclick="weNavigate('${parent}')"><span class="ws-icon">📁</span><span class="ws-name">..</span><span class="ws-meta">Voltar</span></div>`;
  }
  const dirs=entries.filter(e=>e.type==='dir').sort((a,b)=>a.name.localeCompare(b.name));
  const files=entries.filter(e=>e.type!=='dir').sort((a,b)=>a.name.localeCompare(b.name));
  for(const d of dirs){
    const p=d.path;
    html+=`<div class="ws-item ws-dir" onclick="weNavigate('${p.replace(/'/g,"\\'")}')"><span class="ws-icon">📂</span><span class="ws-name">${escapeHtml(d.name)}</span><div class="ws-item-actions"><button class="btn small ws-del-btn" onclick="event.stopPropagation();weDelete('${p.replace(/'/g,"\\'")}',true)" title="Excluir">🗑</button><button class="btn small" onclick="event.stopPropagation();weRename('${p.replace(/'/g,"\\'")}')" title="Renomear">✏️</button></div></div>`;
  }
  for(const f of files){
    const icon=wsFileIcon(f.type||f.name.split('.').pop());
    const p=f.path;
    html+=`<div class="ws-item ws-file" onclick="wePreviewFile('${p.replace(/'/g,"\\'")}')"><span class="ws-icon">${icon}</span><span class="ws-name">${escapeHtml(f.name)}</span><span class="ws-meta">${f.size!=null?wsHumanSize(f.size):''}</span><div class="ws-item-actions"><button class="btn small" onclick="event.stopPropagation();weDownloadFile('${p.replace(/'/g,"\\'")}')" title="Download">⬇</button><button class="btn small" onclick="event.stopPropagation();weRename('${p.replace(/'/g,"\\'")}')" title="Renomear">✏️</button><button class="btn small ws-del-btn" onclick="event.stopPropagation();weDelete('${p.replace(/'/g,"\\'")}',false)" title="Excluir">🗑</button></div></div>`;
  }
  if(!html)html='<div class="ws-empty">Pasta vazia</div>';
  container.innerHTML=html;
}
function weNavigate(path){renderWeditorTree(path);document.getElementById('wePreviewContent').innerHTML='<div class="ws-empty">Selecione um arquivo para visualizar</div>';}

function weFullPath(name){
  const n=(name||'').trim().replace(/^\/+/,'');
  if(!n)return null;
  return (wePath?wePath+'/':'')+n;
}
async function weditorNewFile(){
  const name=prompt('Nome do novo arquivo (ex.: src/app.js):');
  if(name===null)return;
  const path=weFullPath(name);
  if(!path){alert('Nome inválido.');return;}
  await weCall('write',{path,content:''});
  renderWeditorTree(wePath);
  wePreviewFile(path);
}
async function weditorNewFolder(){
  const name=prompt('Nome da nova pasta:');
  if(name===null)return;
  const path=weFullPath(name);
  if(!path){alert('Nome inválido.');return;}
  await weCall('mkdir',{path});
  renderWeditorTree(wePath);
}
async function weRename(path){
  const newName=prompt(`Renomear "${path}" para:`,weBasename(path));
  if(newName===null||!newName.trim())return;
  const target=weParentDir(path)+(weParentDir(path)?'/':'')+newName.trim();
  try{await weCall('rename',{source:path,target});}catch(e){alert(e.message);return;}
  renderWeditorTree(wePath);
}
async function weDelete(path,isDir){
  if(isDir===undefined){try{const ex=await weCall('exists',{path});isDir=ex&&ex.type==='dir';}catch(e){isDir=false;}}
  if(!confirm(`Excluir "${path}"${isDir?' (recursivamente)':''}?`))return;
  try{await weCall('delete',{path,recursive:true});}catch(e){alert(e.message);return;}
  renderWeditorTree(wePath);
  document.getElementById('wePreviewContent').innerHTML='<div class="ws-empty">Item excluído</div>';
}
async function wePreviewFile(path){
  let data;
  try{data=await weCall('read',{path,max_chars:200000});}catch(e){document.getElementById('wePreviewContent').innerHTML=`<div class="ws-empty" style="color:var(--error)">${escapeHtml(e.message)}</div>`;return;}
  const content=(data&&typeof data==='object'&&'content'in data)?data.content:'';
  const isText=data&&data.encoding==='text';
  const name=weBasename(path);
  const type=(name.split('.').pop()||'').toLowerCase();
  const isImage=['png','jpg','jpeg','gif','webp','svg','bmp','ico'].includes(type);
  let html=`<div class="ws-preview-header"><strong>${escapeHtml(name)}</strong><span class="ws-meta">${data&&data.size!=null?wsHumanSize(data.size):''}</span><div class="ws-preview-actions">`;
  if(isText){
    html+=`<button class="btn small" onclick="weEditFile('${path.replace(/'/g,"\\'")}')">✏️ Editar</button><button class="btn small" onclick="weCopyServerContent('${path.replace(/'/g,"\\'")}')">📋 Copiar</button><button class="btn small" onclick="weDownloadFile('${path.replace(/'/g,"\\'")}')">⬇ Download</button>`;
    html+=`</div></div><pre class="ws-preview-code" id="weCode"><code>${escapeHtml(content)}</code></pre>`;
  }else if(isImage){
    html+=`<button class="btn small" onclick="weDownloadFile('${path.replace(/'/g,"\\'")}')">⬇ Download</button></div></div><div class="ws-img-wrap"><img src="data:${'image/'+type};base64,${content}" class="ws-img-preview" onerror="this.parentElement.innerHTML='<div class=\\'ws-preview-binary\\'>Não foi possível exibir a imagem.</div>'"></div>`;
  }else{
    html+=`<button class="btn small" onclick="weDownloadFile('${path.replace(/'/g,"\\'")}')">⬇ Download</button></div></div><div class="ws-preview-binary">Arquivo binário (${type}).<br>Tamanho: ${data&&data.size!=null?wsHumanSize(data.size):''}</div>`;
  }
  document.getElementById('wePreviewContent').innerHTML=html;
}
async function weEditFile(path){
  let data;
  try{data=await weCall('read',{path,max_chars:200000});}catch(e){alert(e.message);return;}
  const content=(data&&typeof data==='object'&&'content'in data)?data.content:'';
  document.getElementById('wePreviewContent').innerHTML=`<div class="ws-preview-header"><strong>${escapeHtml(weBasename(path))}</strong><div class="ws-preview-actions"><button class="btn small" onclick="weSaveFile('${path.replace(/'/g,"\\'")}')">💾 Salvar</button><button class="btn small" onclick="wePreviewFile('${path.replace(/'/g,"\\'")}')">↩ Cancelar</button></div></div><textarea id="weEditArea" class="ws-preview-code" style="width:100%;height:340px;resize:vertical;font-family:'Lucida Console',monospace;font-size:.82em;white-space:pre-wrap;word-break:break-word;color:#000;background:#fff;border:1px inset #a0a0a0;padding:8px;margin:0">${escapeHtml(content)}</textarea>`;
  const ta=document.getElementById('weEditArea');
  if(ta)ta.focus();
}
async function weSaveFile(path){
  const ta=document.getElementById('weEditArea');
  if(!ta)return;
  try{await weCall('write',{path,content:ta.value});}catch(e){alert(e.message);return;}
  renderWeditorTree(wePath);
  wePreviewFile(path);
}
async function weDownloadFile(path){
  try{
    const data=await weCall('read',{path,max_chars:5000000});
    const content=(data&&typeof data==='object'&&'content'in data)?data.content:'';
    const type=(path.split('.').pop()||'txt').toLowerCase();
    const mime={html:'text/html',css:'text/css',js:'application/javascript',json:'application/json',txt:'text/plain',md:'text/markdown',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'}[type]||'application/octet-stream';
    let blob;
    if(data&&data.encoding==='base64')blob=new Blob([atob(content)],{type:mime});
    else blob=new Blob([content],{type:mime});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=weBasename(path);
    a.click();
    URL.revokeObjectURL(a.href);
  }catch(e){alert(e.message);}
}
async function weCopyServerContent(path){
  try{
    const data=await weCall('read',{path,max_chars:200000});
    const content=(data&&typeof data==='object'&&'content'in data)?data.content:'';
    navigator.clipboard.writeText(content).catch(()=>{});
  }catch(e){alert(e.message);}
}

function generateBookPDF(){
  const files=wsGetFiles();
  const mdFiles=Object.keys(files)
    .filter(f=>f.match(/^livro1\/.*\.md$/i))
    .sort((a,b)=>{
      const na=a.match(/capitulo_(\d+)/i);
      const nb=b.match(/capitulo_(\d+)/i);
      if(na&&nb)return parseInt(na[1])-parseInt(nb[1]);
      if(na)return-1;if(nb)return 1;
      if(a.includes('indice'))return 1;if(b.includes('indice'))return-1;
      return a.localeCompare(b);
    });
  if(!mdFiles.length){alert('Nenhum arquivo .md encontrado em /livro1');return;}
  let fullMD='';
  for(const f of mdFiles){
    const content=files[f].content||'';
    fullMD+=content+'\n\n---\n\n';
  }
  const html=mdToHTML(fullMD);
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BBR">
<head>
<meta charset="UTF-8">
<title>Livro - Gerado pelo Chat do Ruivo</title>
<style>
  @page{margin:2cm;size:A4}
  body{font-family:'Georgia','Times New Roman',serif;font-size:12pt;line-height:1.8;color:#1a1a1a;max-width:700px;margin:0 auto;padding:20px}
  h1{font-size:22pt;text-align:center;margin:40px 0 20px;border-bottom:2px solid #333;padding-bottom:10px}
  h2{font-size:16pt;margin:30px 0 12px;color:#333;border-bottom:1px solid #ccc;padding-bottom:6px}
  h3{font-size:13pt;margin:20px 0 8px;color:#555}
  p{text-align:justify;text-indent:2em;margin:0.5em 0}
  hr{border:none;border-top:1px solid #ccc;margin:30px 0}
  code{background:#f4f4f4;padding:2px 6px;border-radius:3px;font-size:10pt}
  pre{background:#f4f4f4;padding:12px;border-radius:4px;overflow-x:auto;font-size:10pt}
  blockquote{border-left:3px solid #999;padding-left:16px;color:#666;font-style:italic}
  .print-btn{position:fixed;top:20px;right:20px;padding:10px 20px;background:#e94560;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.3)}
  .print-btn:hover{background:#c73e54}
  @media print{.print-btn{display:none}body{padding:0}}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
${html}
<script>document.title='Livro - Chat do Ruivo';</script>
</body>
</html>`);
  win.document.close();
}

function mdToHTML(md){
  let html=md;
  html=html.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  html=html.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  html=html.replace(/^# (.+)$/gm,'<h1>$1</h1>');
  html=html.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  html=html.replace(/\*(.+?)\*/g,'<em>$1</em>');
  html=html.replace(/`([^`]+)`/g,'<code>$1</code>');
  html=html.replace(/```(\w*)\n([\s\S]*?)```/g,'<pre><code>$2</code></pre>');
  html=html.replace(/^---$/gm,'<hr>');
  html=html.replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>');
  html=html.replace(/^\- (.+)$/gm,'<li>$1</li>');
  html=html.replace(/(<li>.*<\/li>)/s,m=>'<ul>'+m+'</ul>');
  const paragraphs=html.split(/\n{2,}/);
  html=paragraphs.map(p=>{
    p=p.trim();
    if(!p)return'';
    if(/^<[hupbocol]/.test(p)||p==='<hr>')return p;
    if(p.includes('<li>'))return p;
    return'<p>'+p.replace(/\n/g,'<br>')+'</p>';
  }).join('\n');
  return html;
}

// Lista de proxies CORS públicos para fallback
const CORS_PROXIES=[
  {name:'corsproxy.io', prefix:'https://corsproxy.io/?url=', encode:true},
  {name:'allorigins', prefix:'https://api.allorigins.win/raw?url=', encode:true},
  {name:'codetabs', prefix:'https://api.codetabs.com/v1/proxy?quest=', encode:true},
  {name:'thingproxy', prefix:'https://thingproxy.freeboard.io/fetch/', encode:false},
];

function buildProxyURL(proxyEntry, targetURL){
  if(proxyEntry.encode) return proxyEntry.prefix + encodeURIComponent(targetURL);
  return proxyEntry.prefix + targetURL;
}

async function fetchWithCORFallback(url, opts={}, timeout=30000){
  const strategies=[];

  // Estratégia baseada na config
  if(wcurlProxy==='direct'){
    strategies.push({name:'direct',url,opts});
  } else if(wcurlProxy==='custom'&&wcurlCustomProxy){
    const proxyUrl=wcurlCustomProxy.includes('{url}')
      ? wcurlCustomProxy.replace('{url}',encodeURIComponent(url))
      : wcurlCustomProxy+encodeURIComponent(url);
    strategies.push({name:'custom-proxy',url:proxyUrl,opts});
  } else {
    // Auto: tenta direto primeiro, depois proxies
    strategies.push({name:'direct',url,opts});
    for(const p of CORS_PROXIES){
      strategies.push({name:`proxy:${p.name}`,url:buildProxyURL(p,url),opts:{...opts,headers:{}}});
    }
  }

  let lastError=null;
  for(const strat of strategies){
    try{
      const ctrl=new AbortController();
      const to=setTimeout(()=>ctrl.abort(),Math.min(timeout,60000));
      const res=await fetch(strat.url,{...strat.opts,signal:ctrl.signal});
      clearTimeout(to);

      if(res.ok||res.status===301||res.status===302){
        return {response:res,method:strat.name};
      }
      // Se proxy retornou erro, tenta próximo
      if(strat.name!=='direct'){
        lastError=new Error(`HTTP ${res.status} via ${strat.name}`);
        continue;
      }
      // Direto com erro HTTP - ainda pode ser válido (4xx, 5xx)
      return {response:res,method:strat.name};
    }catch(err){
      lastError=err;
      // Se é erro de rede/CORS, tenta próxima estratégia
      continue;
    }
  }

  throw new Error(`Failed to fetch (todas estratégias falharam). Último erro: ${lastError?.message}. ` +
    `Possíveis causas: CORS, site fora do ar, ou bloqueio de rede. ` +
    `Tente configurar um proxy customizado.`);
}

const WCURL_TOOLS=[
  {type:'function',function:{name:'wcurl',description:'Faz requisição HTTP via fetch() com fallback automático de proxy CORS. Retorna status, headers e body. Se a requisição direta falhar por CORS, tenta proxies automaticamente.',parameters:{type:'object',properties:{url:{type:'string',description:'URL completa da requisição'},method:{type:'string',enum:['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'],description:'Método HTTP (padrão: GET)'},headers:{type:'object',description:'Headers HTTP (obs: podem ser ignorados em modo proxy)'},body:{type:'string',description:'Corpo da requisição (POST/PUT/PATCH)'},timeout:{type:'number',description:'Timeout em ms (padrão: 30000)'}},required:['url']}}},
  {type:'function',function:{name:'wcurl_json',description:'Requisição HTTP que retorna JSON parseado. Usa fallback CORS automático.',parameters:{type:'object',properties:{url:{type:'string',description:'URL completa'},method:{type:'string',enum:['GET','POST','PUT','PATCH','DELETE'],description:'Método (padrão: GET)'},headers:{type:'object',description:'Headers HTTP'},body:{type:'string',description:'Corpo JSON string'},timeout:{type:'number',description:'Timeout ms'}},required:['url']}}},
  {type:'function',function:{name:'wcurl_download',description:'Baixa conteúdo de URL (com fallback CORS) e retorna primeiros N caracteres. Útil para ler páginas web.',parameters:{type:'object',properties:{url:{type:'string',description:'URL para baixar'},max_chars:{type:'number',description:'Máx chars a retornar (padrão: 5000, máx: 50000)'},headers:{type:'object',description:'Headers HTTP'}},required:['url']}}}
];

const JSON_CAT_CFG={
  agents:{label:'Agente',list:()=>agents,key:'llama_agents',render:renderAgents,
    norm:d=>({name:d.name||d.nome,desc:d.desc||d.description||undefined,icon:d.icon||'🤖',prompt:d.prompt||d.system||d.systemPrompt||'',serverIndex:d.serverIndex??null,skillIndex:d.skillIndex??null,temperature:d.temperature!==undefined?parseFloat(d.temperature):undefined,maxTokens:d.max_tokens||d.maxTokens?parseInt(d.max_tokens||d.maxTokens):undefined,topP:d.top_p!==undefined||d.topP!==undefined?parseFloat(d.top_p??d.topP):undefined,maxMsgs:d.max_msgs||d.maxMsgs?parseInt(d.max_msgs||d.maxMsgs):undefined}),
    fmt:a=>`${a.icon||''} ${a.name} — ${(a.desc||a.prompt||'').substring(0,50)}`},
  subAgents:{label:'Sub-Agente',list:()=>subAgents,key:'llama_subagents',render:renderSubAgents,
    norm:d=>({name:(d.name||d.nome||'').replace(/[^a-zA-Z0-9_-]/g,''),desc:d.desc||d.description||undefined,icon:d.icon||undefined,prompt:d.prompt||d.system||d.systemPrompt||'',serverIndex:d.serverIndex??null,temperature:d.temperature!==undefined?parseFloat(d.temperature):undefined,maxTokens:d.max_tokens||d.maxTokens?parseInt(d.max_tokens||d.maxTokens):undefined}),
    fmt:a=>`/${a.name} — ${(a.desc||a.prompt||'').substring(0,50)}`},
  skills:{label:'Skill',list:()=>skills,key:'llama_skills',render:renderSkills,
    norm:d=>({name:d.name||d.nome,prompt:d.prompt||d.system||d.systemPrompt||'',temperature:d.temperature!==undefined?parseFloat(d.temperature):undefined,icon:d.icon||undefined}),
    fmt:s=>`${s.icon||''} ${s.name}`},
  orchestrators:{label:'Orquestrador',list:()=>orchestrators,key:'llama_orchestrators',render:renderOrchestrators,
    norm:d=>({name:d.name||d.nome,desc:d.desc||d.description||undefined,icon:d.icon||'🔗',mode:d.mode||'sequential',serverIndex:d.serverIndex??null,agentIndex:d.agentIndex??null,skillIndex:d.skillIndex??null,subAgentIndices:Array.isArray(d.subAgentIndices)?d.subAgentIndices:[],mcpIndices:Array.isArray(d.mcpIndices)?d.mcpIndices:[],systemPrompt:d.systemPrompt||d.prompt||undefined,temperature:d.temperature!==undefined?parseFloat(d.temperature):undefined,maxTokens:d.max_tokens||d.maxTokens?parseInt(d.max_tokens||d.maxTokens):undefined,topP:d.top_p!==undefined||d.topP!==undefined?parseFloat(d.top_p??d.topP):undefined,steps:Array.isArray(d.steps)?d.steps:[]}),
    fmt:o=>`${o.icon||''} ${o.name} [${o.mode}]`}
};
let entityJSONCat=null;
function openEntityJSONModal(cat){if(!JSON_CAT_CFG[cat])return;entityJSONCat=cat;document.getElementById('entityJSONTitle').textContent=`Importar ${JSON_CAT_CFG[cat].label}(s) via JSON`;document.getElementById('entityJSONInput').value='';document.getElementById('entityJSONPreview').innerHTML='';document.getElementById('entityJSONPreview').classList.remove('visible');document.getElementById('btnImportEntityJSON').disabled=true;openModal('modalEntityJSON');}
function parseEntityJSON(raw,cfg){const data=JSON.parse(raw);let items=[];if(Array.isArray(data))items=data;else if(data&&typeof data==='object'){for(const v of Object.values(data)){if(Array.isArray(v)){items=v;break;}}if(!items.length)items=[data];}
  return items.filter(i=>i&&typeof i==='object').map(cfg.norm).filter(i=>i.name&&(!('prompt'in i)||i.prompt));}
function previewEntityJSON(){const raw=document.getElementById('entityJSONInput').value.trim();const preview=document.getElementById('entityJSONPreview');const btn=document.getElementById('btnImportEntityJSON');if(!raw){preview.classList.remove('visible');btn.disabled=true;return;}try{const cfg=JSON_CAT_CFG[entityJSONCat];const parsed=parseEntityJSON(raw,cfg);if(!parsed.length)throw new Error('Nenhum item válido (precisa de "name" e "prompt").');preview.innerHTML=`<strong>${parsed.length} ${cfg.label}(s):</strong><br>`+parsed.map(a=>`<span class="ok">✓</span> ${escapeHtml(cfg.fmt(a))}`).join('<br>');preview.classList.add('visible');btn.disabled=false;}catch(e){preview.innerHTML=`<span class="err">✗ ${e.message}</span>`;preview.classList.add('visible');btn.disabled=true;}}
function importEntityFromJSON(){const raw=document.getElementById('entityJSONInput').value.trim();try{const cfg=JSON_CAT_CFG[entityJSONCat];if(!cfg)return;const parsed=parseEntityJSON(raw,cfg);if(!parsed.length){alert('Nenhum item válido.');return;}const list=cfg.list();let added=0,skipped=0;for(const d of parsed){if(list.find(x=>x.name.toLowerCase()===d.name.toLowerCase())){skipped++;continue;}list.push(d);added++;}localStorage.setItem(cfg.key,JSON.stringify(list));cfg.render();closeModal('modalEntityJSON');alert(`✓ ${added} ${cfg.label.toLowerCase()}(s) importado(s).${skipped?` ${skipped} duplicado(s) ignorado(s).`:''}`);}catch(e){alert('Erro: '+e.message);}}
async function executeWcurl(toolName,args){
  switch(toolName){
    case 'wcurl':return await wcurlFetch(args);
    case 'wcurl_json':return await wcurlJSON(args);
    case 'wcurl_download':return await wcurlDownload(args);
    default:throw new Error(`Tool desconhecida: ${toolName}`);
  }
}

async function wcurlFetch(args){
  const{url,method='GET',headers={},body,timeout=30000}=args;
  if(!url)throw new Error('URL obrigatória');
  try{
    const opts={method:method.toUpperCase(),headers:{...headers}};
    if(body&&['POST','PUT','PATCH'].includes(method.toUpperCase()))opts.body=body;

    const{response:res,method:usedMethod}=await fetchWithCORFallback(url,opts,timeout);

    const respHeaders={};
    try{res.headers.forEach((v,k)=>{respHeaders[k]=v;});}catch(e){}
    let responseBody;
    const ct=res.headers.get('content-type')||'';
    try{
      if(ct.includes('application/json'))responseBody=JSON.stringify(await res.json(),null,2);
      else responseBody=await res.text();
    }catch(e){responseBody='[Não foi possível ler o corpo da resposta]';}
    if(responseBody.length>20000)responseBody=responseBody.substring(0,20000)+'\n... [truncado]';

    return JSON.stringify({
      status:res.status,
      statusText:res.statusText,
      via:usedMethod,
      headers:respHeaders,
      body:responseBody
    },null,2);
  }catch(err){throw err;}
}

async function wcurlJSON(args){
  const{url,method='GET',headers={},body,timeout=30000}=args;
  if(!url)throw new Error('URL obrigatória');
  try{
    const opts={method:method.toUpperCase(),headers:{'Accept':'application/json',...headers}};
    if(body&&['POST','PUT','PATCH'].includes(method.toUpperCase())){
      opts.body=body;
      if(!opts.headers['Content-Type'])opts.headers['Content-Type']='application/json';
    }

    const{response:res,method:usedMethod}=await fetchWithCORFallback(url,opts,timeout);

    if(!res.ok){
      const errText=await res.text().catch(()=>'');
      throw new Error(`HTTP ${res.status} via ${usedMethod}: ${errText.substring(0,500)}`);
    }

    const data=await res.json();
    const result=JSON.stringify(data,null,2);
    const prefix=usedMethod!=='direct'?`[via ${usedMethod}]\n`:'';
    return prefix+(result.length>20000?result.substring(0,20000)+'\n... [truncado]':result);
  }catch(err){throw err;}
}

async function wcurlDownload(args){
  const{url,max_chars=5000,headers={}}=args;
  if(!url)throw new Error('URL obrigatória');
  try{
    const{response:res,method:usedMethod}=await fetchWithCORFallback(url,{headers},30000);
    if(!res.ok)throw new Error(`HTTP ${res.status} via ${usedMethod}`);
    const text=await res.text();
    const limit=Math.min(max_chars||5000,50000);
    const prefix=usedMethod!=='direct'?`[via ${usedMethod}]\n`:'';
    if(text.length>limit)return prefix+text.substring(0,limit)+`\n\n... [truncado - ${text.length} chars]`;
    return prefix+text;
  }catch(err){throw err;}
}

function toggleWcurl(){wcurlEnabled=!wcurlEnabled;localStorage.setItem('wcurl_enabled',JSON.stringify(wcurlEnabled));renderMCPs();}

// ===== FUNÇÕES DO PROJETO (tela inicial) =====
const PROJECT_FUNCTIONS=[
  {title:'🖥 Servidores',items:[
    ['Conectar a LLMs','Adicione servidores OpenAI-compatíveis (locais ou remotos) com API key, modelo e parâmetros.'],
    ['Fallback automático','Se o servidor principal falhar, o chat tenta os servidores reserva na ordem definida.'],
    ['Relay CORS','Servidores com CORS bloqueado são acessados via proxy PHP integrado.'],
    ['Detecção de modelos','Identifica automaticamente os modelos disponíveis no servidor.']
  ]},
  {title:'💬 Chat e IA',items:[
    ['Agentes','Personas com prompt próprio (ex.: gamedev, escritor) para direcionar as respostas.'],
    ['Sub-Agentes','Comandos como /critico, /pesquisador, /gramatical para tarefas em segundo plano.'],
    ['Skills','Prompts reutilizáveis que podem ser ativados pelo chat.'],
    ['Orquestradores','Pipelines multi-etapa que coordenam agentes, sub-agentes e ferramentas.']
  ]},
  {title:'📁 Arquivos',items:[
    ['Workspace local','Cria, lê, edita, renomeia e exclui arquivos salvos no navegador (localStorage).'],
    ['Workspace do servidor','Gerencia arquivos no servidor PHP: listar, ler, escrever, criar pastas, buscar e mais.'],
    ['Explorador visual','Navegue pelos arquivos com interface gráfica, pré-visualização e download.']
  ]},
  {title:'🌐 Web',items:[
    ['Requisições HTTP','Faz chamadas GET/POST a qualquer URL com fallback automático de proxy CORS.'],
    ['Leitura de páginas','Baixa e extrai o conteúdo de páginas web para análise.']
  ]},
  {title:'🧮 Matemática',items:[
    ['Calculadora','Avalia expressões matemáticas com parser próprio seguro (sem eval).'],
    ['Estatísticas','Calcula média, mediana, desvio padrão e mais de listas de números.'],
    ['Porcentagens','Cálculos de percentual e variação percentual.']
  ]},
  {title:'🕐 Data e hora',items:[
    ['Data/hora atual','Consulta a data e hora com suporte a fuso horário IANA.'],
    ['Operações com datas','Soma/subtrai tempo, calcula diferenças e dias úteis entre datas.']
  ]},
  {title:'🧩 Micro-MCPs',items:[
    ['FTP','Conecta a servidores FTP para listar, enviar, baixar, renomear e gerenciar arquivos remotos.'],
    ['Criador','Cria novos módulos de ferramentas PHP diretamente pelo chat.']
  ]}
];
function renderHomeFunctions(){
  return `<div class="msg assistant" style="max-width:100%"><div class="meta">🤖 Web Harness</div><div style="font-size:1.02em;margin-bottom:8px"><strong>Bem-vindo!</strong> Selecione um servidor e inicie uma conversa, ou use as funções do projeto:</div>${PROJECT_FUNCTIONS.map(sec=>`<div style="margin-top:10px"><div style="font-weight:bold;border-bottom:1px solid #d8ce9a;padding-bottom:2px;margin-bottom:4px">${sec.title}</div>${sec.items.map(([n,d])=>`<div style="font-size:.92em;margin:2px 0"><span style="font-weight:bold;color:#5a4a9a">${n}</span> — ${d}</div>`).join('')}</div>`).join('')}</div>`;
}

// ===== INIT =====
renderServers();renderConversations();renderChat();renderMCPs();renderSkills();renderAgents();renderSubAgents();renderOrchestrators();
checkAllMCPStatus();
refreshMicroMCPTools();

function toggleSidebar(){sidebarVisible=!sidebarVisible;document.getElementById('sidebar').classList.toggle('hidden',!sidebarVisible);}

function toggleSection(sectionId,key){
  const el=document.getElementById(sectionId);
  if(!el)return;
  const collapsed=el.classList.toggle('collapsed');
  localStorage.setItem(key,JSON.stringify(collapsed));
}
function applySectionStates(){
  const map={
    serversSection:'llama_servers_collapsed',
    convSection:'llama_convs_collapsed',
    agentSection:'llama_agents_collapsed',
    subAgentSection:'llama_subagents_collapsed',
    skillSection:'llama_skills_collapsed',
    mcpSection:'llama_mcps_collapsed',
    orchSection:'llama_orchs_collapsed'
  };
  for(const[id,key]of Object.entries(map)){
    const el=document.getElementById(id);
    if(!el)continue;
    let c=false;
    try{c=JSON.parse(localStorage.getItem(key)??'false');}catch(e){}
    el.classList.toggle('collapsed',c);
  }
}
applySectionStates();

// ===== SPEED =====
function startSpeedTracking(){tokenCount=0;genStartTime=performance.now();const el=document.getElementById('speedIndicator');el.classList.add('visible');el.textContent='⚡ 0 tok/s';speedInterval=setInterval(()=>{const e=(performance.now()-genStartTime)/1000;if(e>0.1)el.textContent=`⚡ ${(tokenCount/e).toFixed(1)} tok/s`;},500);}
function incrementTokens(n=1){tokenCount+=n;}
function stopSpeedTracking(ft){if(speedInterval){clearInterval(speedInterval);speedInterval=null;}const el=document.getElementById('speedIndicator');const e=(performance.now()-genStartTime)/1000;const tps=e>0?(ft/e).toFixed(1):'0';if(ft>0)el.textContent=`⚡ ${tps} tok/s (${ft} tok)`;setTimeout(()=>el.classList.remove('visible'),4000);return{elapsed:e,tps};}

// ===== MCP TOOLS =====
function getActiveMCPTools(){
  let allTools=[];
  if(wcurlEnabled)allTools=allTools.concat(WCURL_TOOLS.map(t=>({...t,_mcpIndex:WCURL_ID})));
  if(wcalcEnabled)allTools=allTools.concat(WCALC_TOOLS.map(t=>({...t,_mcpIndex:WCALC_ID})));
  if(workspaceEnabled)allTools=allTools.concat(WORKSPACE_TOOLS.map(t=>({...t,_mcpIndex:WS_ID})));
  if(wtimeEnabled)allTools=allTools.concat(WTIME_TOOLS.map(t=>({...t,_mcpIndex:WTIME_ID})));
  if(weditorEnabled)allTools=allTools.concat(WEDITOR_TOOLS.map(t=>({...t,_mcpIndex:WEDITOR_ID})));
  if(mmcpEnabled)allTools=allTools.concat(mmcpToolsCache);
  for(let i=0;i<mcps.length;i++){
    if(mcps[i].enabled!==false&&mcpStatus[i]==='online'&&mcpToolsCache[i])
      allTools=allTools.concat(mcpToolsCache[i].map(t=>({...t,_mcpIndex:i})));
  }
  return allTools.filter(t=>t&&t.function&&typeof t.function.name==='string'&&t.function.name.length>0);
}

// O parser de schemas do Ollama (/v1/chat/completions) quebra ao encontrar
// `type:'array'` (mesmo sem `items`). Converte para string e descarta
// `items`/`prefixItems`. Mantém o resto do schema intacto.
function sanitizeToolSchema(node){
  if(Array.isArray(node))return node.map(sanitizeToolSchema);
  if(node&&typeof node==='object'){
    if(node.type==='array'){
      const d=(typeof node.description==='string'?node.description:'')+' (lista separada por vírgula)';
      return {type:'string',description:d};
    }
    const out={};
    for(const k in node){
      if(k==='items'||k==='prefixItems')continue;
      out[k]=sanitizeToolSchema(node[k]);
    }
    return out;
  }
  return node;
}
function sanitizeToolsForOllama(tools){
  if(!Array.isArray(tools))return tools;
  return tools.map(t=>{
    if(t&&t.function&&t.function.parameters)return {...t,function:{...t.function,parameters:sanitizeToolSchema(t.function.parameters)}};
    return t;
  });
}
// Quando o servidor é Ollama nativo (/v1/chat/completions), remove campos que
// o Ollama não suporta e responde 400: tool_choice, stream_options e tools.
// Tools são removidos porque o parser de tool calls do Ollama via /v1 quebra
// com muitos modelos (ex.: Qwen3/ornith geram tool calls malformados -> 400
// "can't find closing '}' symbol").
function applyOllamaCompat(srv, body){
  if(!srv?.ollama)return body;
  if(body.tool_choice!==undefined)delete body.tool_choice;
  if(body.stream_options!==undefined)delete body.stream_options;
  if(body.tools!==undefined)delete body.tools;
  return body;
}
// Ollama rejeita o campo reasoning_content em mensagens; remove ao montar histórico.
function stripOllamaMessages(srv, messages){
  if(!srv?.ollama)return messages;
  return messages.map(m=>{
    if(m&&m.role==='assistant'&&m.reasoning_content!==undefined){const c={...m};delete c.reasoning_content;return c;}
    return m;
  });
}

async function executeMCPToolByIndex(mcpIndex,toolName,args){
  if(mcpIndex===WCURL_ID)return await executeWcurl(toolName,args);
  if(mcpIndex===WCALC_ID)return await executeWcalc(toolName,args);
  if(mcpIndex===WS_ID)return await executeWorkspace(toolName,args);
  if(mcpIndex===WTIME_ID)return await executeWtime(toolName,args);
  if(mcpIndex===WEDITOR_ID)return await executeWeditor(toolName,args);
  if(mcpIndex===MMCP_ID)return await executeMicroMCP(toolName,args);
  const mcp=mcps[mcpIndex];if(!mcp)throw new Error('MCP não encontrado');
  const headers={'Content-Type':'application/json',...(mcp.headers||{})};
  const endpoints=[
    {url:`${mcp.url}/tools/call`,body:{name:toolName,arguments:args}},
    {url:mcp.url,body:{method:'tools/call',params:{name:toolName,arguments:args},jsonrpc:'2.0',id:Date.now()}}
  ];
  for(const ep of endpoints){
    try{
      const res=await fetch(ep.url,{method:'POST',headers,body:JSON.stringify(ep.body),signal:AbortSignal.timeout(30000)});
      if(!res.ok)continue;
      const data=await res.json();
      if(data.result!==undefined)return typeof data.result==='string'?data.result:JSON.stringify(data.result);
      if(data.content)return Array.isArray(data.content)?data.content.map(c=>c.text||JSON.stringify(c)).join('\n'):JSON.stringify(data.content);
      return JSON.stringify(data);
    }catch(e){}
  }
  throw new Error(`Falha ao executar "${toolName}"`);
}

async function fetchMCPTools(index){
  const mcp=mcps[index];if(!mcp)return[];
  const headers={'Content-Type':'application/json',...(mcp.headers||{})};
  const endpoints=[
    {url:`${mcp.url}/tools/list`,method:'POST',body:{}},
    {url:`${mcp.url}/tools`,method:'GET',body:null},
    {url:mcp.url,method:'POST',body:{method:'tools/list',jsonrpc:'2.0',id:1}}
  ];
  for(const ep of endpoints){
    try{
      const opts={method:ep.method,headers,signal:AbortSignal.timeout(8000)};
      if(ep.body)opts.body=JSON.stringify(ep.body);
      const res=await fetch(ep.url,opts);if(!res.ok)continue;
      const data=await res.json();
      let tools=null;
      if(Array.isArray(data))tools=data;
      else if(data.result?.tools)tools=data.result.tools;
      else if(Array.isArray(data.tools)&&typeof data.tools[0]==='object'&&data.tools[0]!==null)tools=data.tools;
      if(!tools||!tools.length)continue;
      return tools.map(t=>({type:'function',function:{name:t.name,description:t.description||'',parameters:t.inputSchema||t.parameters||{type:'object',properties:{}}}}))
        .filter(t=>typeof t.function.name==='string'&&t.function.name.length>0);
    }catch(e){}
  }
  return[];
}

// ===== MCP STATUS =====
async function checkMCPStatus(index){
  const mcp=mcps[index];if(!mcp)return;
  mcpStatus[index]='checking';renderMCPs();
  try{
    const ctrl=new AbortController();const to=setTimeout(()=>ctrl.abort(),5000);
    const res=await fetch(mcp.url,{method:'GET',headers:{...(mcp.headers||{})},signal:ctrl.signal});
    clearTimeout(to);mcpStatus[index]=(res.ok||res.status===405||res.status===404)?'online':'offline';
  }catch(e){mcpStatus[index]='offline';}
  if(mcpStatus[index]==='online')mcpToolsCache[index]=await fetchMCPTools(index);
  else mcpToolsCache[index]=[];
  renderMCPs();
}
async function checkAllMCPStatus(){for(let i=0;i<mcps.length;i++)await checkMCPStatus(i);}
function toggleMCPEnabled(i){mcps[i].enabled=mcps[i].enabled===false?true:false;localStorage.setItem('llama_mcps',JSON.stringify(mcps));renderMCPs();}

// Seleciona/desmarca todos os MCPs (built-ins + remotos) de uma vez.
function allMCPsEnabled(){
  const builtins=[wcurlEnabled,wcalcEnabled,workspaceEnabled,wtimeEnabled,weditorEnabled,mmcpEnabled];
  return builtins.every(Boolean)&&mcps.every(m=>m.enabled!==false);
}
function toggleAllMCPs(){
  const enable=!allMCPsEnabled();
  wcurlEnabled=enable;wcalcEnabled=enable;workspaceEnabled=enable;wtimeEnabled=enable;weditorEnabled=enable;mmcpEnabled=enable;
  ['wcurl_enabled','wcalc_enabled','workspace_enabled','wtime_enabled','weditor_enabled','mmcp_enabled'].forEach(k=>localStorage.setItem(k,JSON.stringify(enable)));
  mcps.forEach(m=>{m.enabled=enable;});
  localStorage.setItem('llama_mcps',JSON.stringify(mcps));
  renderMCPs();
  const btn=document.getElementById('btnSelectAllMCPs');
  if(btn)btn.textContent=enable?'☑ Desmarcar todos':'☑ Selecionar todos';
}

// ===== MCP RENDER =====
function renderMCPs(){
  let html='';
  const ws=wcurlEnabled?'online':'offline';
  const proxyLabel=wcurlProxy==='auto'?'auto-proxy':wcurlProxy==='direct'?'direto':'custom';
  html+=`<div class="mcp-item builtin"><div class="mcp-info"><span class="mcp-name">🌐 Wcurl <span class="mcp-badge">built-in</span></span><span class="mcp-url">fetch() + fallback CORS [${proxyLabel}]</span><div class="mcp-status-row"><span class="mcp-status-dot ${ws}"></span><span class="mcp-status-text ${wcurlEnabled?'online':'offline'}">${wcurlEnabled?'Ativo':'Desativado'}</span></div><span class="mcp-tools-count">🔧 3 ferramentas · 4 proxies CORS</span></div><div class="item-actions"><button class="mcp-toggle ${wcurlEnabled?'enabled':'disabled'}" onclick="toggleWcurl()">${wcurlEnabled?'✅':'⬜'}</button><button onclick="openWcurlConfig()" title="Configurar proxy">⚙️</button></div></div>`;
  const wcs=wcalcEnabled?'online':'offline';
  html+=`<div class="mcp-item builtin"><div class="mcp-info"><span class="mcp-name">🧮 Wcalc <span class="mcp-badge">built-in</span></span><span class="mcp-url">matemática segura · expressões + estatística</span><div class="mcp-status-row"><span class="mcp-status-dot ${wcs}"></span><span class="mcp-status-text ${wcalcEnabled?'online':'offline'}">${wcalcEnabled?'Ativo':'Desativado'}</span></div><span class="mcp-tools-count">🔧 3 ferramentas · parser próprio (sem eval)</span></div><div class="item-actions"><button class="mcp-toggle ${wcalcEnabled?'enabled':'disabled'}" onclick="toggleWcalc()">${wcalcEnabled?'✅':'⬜'}</button></div></div>`;
  const wss=workspaceEnabled?'online':'offline';
  const wsCount=Object.keys(wsGetFiles()).length;
  html+=`<div class="mcp-item builtin"><div class="mcp-info"><span class="mcp-name">📁 Workspace <span class="mcp-badge">built-in</span></span><span class="mcp-url">arquivos no localStorage · criar/editar/excluir/download</span><div class="mcp-status-row"><span class="mcp-status-dot ${wss}"></span><span class="mcp-status-text ${workspaceEnabled?'online':'offline'}">${workspaceEnabled?'Ativo':'Desativado'}</span></div><span class="mcp-tools-count">🔧 8 ferramentas · ${wsCount} arquivo(s)</span></div><div class="item-actions"><button class="mcp-toggle ${workspaceEnabled?'enabled':'disabled'}" onclick="toggleWorkspace()">${workspaceEnabled?'✅':'⬜'}</button><button onclick="openFileExplorer()" title="Explorador de arquivos">📂</button></div></div>`;
  const wts=wtimeEnabled?'online':'offline';
  html+=`<div class="mcp-item builtin"><div class="mcp-info"><span class="mcp-name">🕐 Wtime <span class="mcp-badge">built-in</span></span><span class="mcp-url">data e hora · agora, somar/subtrair, diferenças e detalhes</span><div class="mcp-status-row"><span class="mcp-status-dot ${wts}"></span><span class="mcp-status-text ${wtimeEnabled?'online':'offline'}">${wtimeEnabled?'Ativo':'Desativado'}</span></div><span class="mcp-tools-count">🔧 4 ferramentas · fuso IANA · Intl nativo</span></div><div class="item-actions"><button class="mcp-toggle ${wtimeEnabled?'enabled':'disabled'}" onclick="toggleWtime()">${wtimeEnabled?'✅':'⬜'}</button></div></div>`;
  const wes=weditorEnabled?'online':'offline';
  html+=`<div class="mcp-item builtin"><div class="mcp-info"><span class="mcp-name">📝 Weditor <span class="mcp-badge">built-in</span></span><span class="mcp-url">arquivos no workspace do servidor (via PHP)</span><div class="mcp-status-row"><span class="mcp-status-dot ${wes}"></span><span class="mcp-status-text ${weditorEnabled?'online':'offline'}">${weditorEnabled?'Ativo':'Desativado'}</span></div><span class="mcp-tools-count">🔧 12 ferramentas · ${weditorBaseUrl()}</span></div><div class="item-actions"><button class="mcp-toggle ${weditorEnabled?'enabled':'disabled'}" onclick="toggleWeditor()">${weditorEnabled?'✅':'⬜'}</button><button onclick="openWeditorConfig()" title="Configurar URL do servidor PHP">⚙️</button><button onclick="openWeditorExplorer()" title="Explorador de arquivos">📂</button></div></div>`;
  const mms=mmcpEnabled?'online':'offline';
  const mmCount=mmcpToolsCache.length;
  html+=`<div class="mcp-item builtin"><div class="mcp-info"><span class="mcp-name">🧩 Micro-MCP <span class="mcp-badge">built-in</span></span><span class="mcp-url">include automático de micro-mcp/*.php via ${mmcpBaseUrl()}</span><div class="mcp-status-row"><span class="mcp-status-dot ${mms}"></span><span class="mcp-status-text ${mmcpEnabled?'online':'offline'}">${mmcpEnabled?'Ativo':'Desativado'}</span></div><span class="mcp-tools-count">🔧 ${mmCount} ferramenta(s)</span></div><div class="item-actions"><button class="mcp-toggle ${mmcpEnabled?'enabled':'disabled'}" onclick="toggleMicroMCP()">${mmcpEnabled?'✅':'⬜'}</button><button onclick="refreshMicroMCPTools()" title="Atualizar ferramentas">🔄</button><button onclick="openMicroMCPManager()" title="Gerenciar micro-MCPs">⚙️</button></div></div>`;
  html+=mcps.map((m,i)=>{
    const status=mcpStatus[i]||'unknown';
    const dot=`<span class="mcp-status-dot ${status}"></span>`;
    const txt=status==='online'?'Ativo':status==='offline'?'Inativo':status==='checking'?'...':'?';
    const cls=status==='online'?'online':status==='offline'?'offline':'';
    const tc=mcpToolsCache[i]?.length||0;
    const toolsTxt=status==='online'?`<span class="mcp-tools-count">🔧 ${tc} ferramenta(s)</span>`:'';
    const enabled=m.enabled!==false;
    return`<div class="mcp-item"><div class="mcp-info"><span class="mcp-name">${m.name}</span><span class="mcp-url">${m.url}</span><div class="mcp-status-row">${dot}<span class="mcp-status-text ${cls}">${txt}</span></div>${toolsTxt}</div><div class="item-actions"><button class="mcp-toggle ${enabled?'enabled':'disabled'}" onclick="event.stopPropagation();toggleMCPEnabled(${i})">${enabled?'✅':'⬜'}</button><button onclick="event.stopPropagation();checkMCPStatus(${i})">🔄</button><button onclick="event.stopPropagation();editMCP(${i})">✏️</button><button onclick="event.stopPropagation();deleteMCP(${i})">🗑</button></div></div>`;
  }).join('');
  document.getElementById('mcpList').innerHTML=html;
  const btn=document.getElementById('btnSelectAllMCPs');
  if(btn)btn.textContent=allMCPsEnabled()?'☑ Desmarcar todos':'☑ Selecionar todos';
}

function openWcurlConfig(){
  const mode=prompt('Modo de proxy Wcurl:\n\n1 = auto (tenta direto, depois proxies CORS)\n2 = direct (sem proxy, pode falhar com CORS)\n3 = custom (proxy personalizado)\n\nAtual: '+(wcurlProxy==='auto'?'1-auto':wcurlProxy==='direct'?'2-direct':'3-custom'),wcurlProxy==='auto'?'1':wcurlProxy==='direct'?'2':'3');
  if(mode==='1'){wcurlProxy='auto';}
  else if(mode==='2'){wcurlProxy='direct';}
  else if(mode==='3'){
    const cp=prompt('URL do proxy customizado.\nUse {url} como placeholder para a URL alvo.\n\nEx.: https://meu-proxy.com/fetch?url={url}\nEx.: https://corsproxy.io/?url={url}',wcurlCustomProxy||'https://corsproxy.io/?url={url}');
    if(cp){wcurlCustomProxy=cp;wcurlProxy='custom';}
    else return;
  }
  else return;
  localStorage.setItem('wcurl_proxy',wcurlProxy);
  localStorage.setItem('wcurl_custom_proxy',wcurlCustomProxy);
  renderMCPs();
}

// ===== MCP JSON =====
function openMCPJSONModal(){document.getElementById('mcpJSONInput').value='';document.getElementById('mcpJSONPreview').innerHTML='';document.getElementById('mcpJSONPreview').classList.remove('visible');document.getElementById('btnImportMCPJSON').disabled=true;openModal('modalMCPJSON');}
function previewMCPJSON(){const raw=document.getElementById('mcpJSONInput').value.trim();const preview=document.getElementById('mcpJSONPreview');const btn=document.getElementById('btnImportMCPJSON');if(!raw){preview.classList.remove('visible');btn.disabled=true;return;}try{const parsed=parseMCPJSON(raw);if(!parsed.length){preview.innerHTML='<span class="err">Nenhum MCP.</span>';preview.classList.add('visible');btn.disabled=true;return;}preview.innerHTML=`<strong>${parsed.length} MCP(s):</strong><br>`+parsed.map(m=>`<span class="ok">✓ ${m.name}</span> → ${m.url}`).join('<br>');preview.classList.add('visible');btn.disabled=false;}catch(e){preview.innerHTML=`<span class="err">✗ ${e.message}</span>`;preview.classList.add('visible');btn.disabled=true;}}
function parseMCPJSON(raw){const data=JSON.parse(raw);let entries=[];if(data.mcp&&typeof data.mcp==='object'&&!Array.isArray(data.mcp)){for(const[n,c]of Object.entries(data.mcp))entries.push(normalizeMCPEntry(n,c));}else if(!Array.isArray(data)&&typeof data==='object'){const vals=Object.values(data);if(vals.length>0&&vals[0]&&typeof vals[0]==='object'&&vals[0].url){for(const[n,c]of Object.entries(data))entries.push(normalizeMCPEntry(n,c));}else throw new Error('Formato não reconhecido.');}else if(Array.isArray(data)){for(const item of data){if(item.url)entries.push(normalizeMCPEntry(item.name||'MCP',item));}}return entries.filter(e=>e&&e.url);}
function normalizeMCPEntry(name,cfg){if(!cfg||typeof cfg!=='object')return null;return{name:(name||'').trim(),url:(cfg.url||'').trim(),enabled:cfg.enabled!==false,headers:cfg.headers||{},type:cfg.type||'remote'};}
function importMCPFromJSON(){const raw=document.getElementById('mcpJSONInput').value.trim();try{const parsed=parseMCPJSON(raw);if(!parsed.length){alert('Nenhum MCP.');return;}let added=0,skipped=0;for(const d of parsed){if(mcps.find(m=>m.url===d.url)){skipped++;continue;}mcps.push(d);added++;}localStorage.setItem('llama_mcps',JSON.stringify(mcps));renderMCPs();closeModal('modalMCPJSON');alert(`✓ ${added} importado(s).${skipped?` ${skipped} duplicado(s).`:''}`);checkAllMCPStatus();}catch(e){alert('Erro: '+e.message);}}

// ===== MCP CRUD =====
function openMCPModal(){editingMCPIndex=null;clearMCPForm();document.getElementById('modalMCPTitle').textContent='Adicionar MCP';openModal('modalMCP');}
function editMCP(i){const m=mcps[i];editingMCPIndex=i;document.getElementById('mcpName').value=m.name||'';document.getElementById('mcpURL').value=m.url||'';const h=document.getElementById('mcpHeaders');h.innerHTML='';if(m.headers)Object.entries(m.headers).forEach(([k,v])=>addHeaderRow(k,v));document.getElementById('modalMCPTitle').textContent='Editar MCP';openModal('modalMCP');}
function cancelMCPModal(){editingMCPIndex=null;clearMCPForm();closeModal('modalMCP');}
function saveMCP(){const name=document.getElementById('mcpName').value.trim();const url=document.getElementById('mcpURL').value.trim();if(!name||!url){alert('Obrigatório.');return;}const headers={};document.querySelectorAll('#mcpHeaders .header-row').forEach(r=>{const k=r.children[0].value.trim(),v=r.children[1].value.trim();if(k&&v)headers[k]=v;});const data={name,url,headers,enabled:true};if(editingMCPIndex!==null&&mcps[editingMCPIndex])mcps[editingMCPIndex]=data;else mcps.push(data);localStorage.setItem('llama_mcps',JSON.stringify(mcps));editingMCPIndex=null;renderMCPs();closeModal('modalMCP');clearMCPForm();checkMCPStatus(mcps.length-1);}
function deleteMCP(i){if(!confirm(`Remover "${mcps[i].name}"?`))return;mcps.splice(i,1);delete mcpStatus[i];delete mcpToolsCache[i];const ns={},nt={};Object.keys(mcpStatus).forEach(k=>{const key=parseInt(k);if(key<i){ns[key]=mcpStatus[key];nt[key]=mcpToolsCache[key];}else if(key>i){ns[key-1]=mcpStatus[key];nt[key-1]=mcpToolsCache[key];}});mcpStatus=ns;mcpToolsCache=nt;localStorage.setItem('llama_mcps',JSON.stringify(mcps));renderMCPs();}
function clearMCPForm(){document.getElementById('mcpName').value='';document.getElementById('mcpURL').value='';document.getElementById('mcpHeaders').innerHTML='';}
function addHeaderRow(key='',val=''){const c=document.getElementById('mcpHeaders');const r=document.createElement('div');r.className='header-row';r.innerHTML=`<input type="text" placeholder="Header" value="${key}"><input type="text" placeholder="Valor" value="${val}"><button class="btn small" onclick="this.parentElement.remove()">✕</button>`;c.appendChild(r);}

// ===== TASKS =====
function addTask(name,saName){const t={id:++taskIdCounter,name,subAgent:saName,status:'running',startTime:Date.now(),endTime:null,result:'',error:null};backgroundTasks.push(t);renderTasks();return t;}
function updateTask(id,status,result,error){const t=backgroundTasks.find(x=>x.id===id);if(!t)return;t.status=status;t.endTime=Date.now();if(result)t.result=result;if(error)t.error=error;renderTasks();const e=((t.endTime-t.startTime)/1000).toFixed(1);if(status==='done'){addTaskMsg(`✅ "${t.subAgent}" concluiu em ${e}s.`);addSubAgentResultMsg(t.subAgent,result);}else if(status==='error')addTaskMsg(`❌ "${t.subAgent}" falhou: ${error}`);}
function addSubAgentResultMsg(subAgentName,result){
  if(!result)return;
  if(activeConv===null||!conversations[activeConv])return;
  const sa=subAgents.find(s=>s.name===subAgentName);
  conversations[activeConv].messages.push({role:'subagent',name:subAgentName,icon:sa?.icon,content:result});
  renderChat();saveConversations();
}
function renderTasks(){const p=document.getElementById('tasksPanel');const at=backgroundTasks.filter(t=>t.status==='running'||(t.endTime&&Date.now()-t.endTime<60000));if(!at.length){p.classList.remove('visible');p.innerHTML='';return;}p.classList.add('visible');p.innerHTML=at.map(t=>{const icon=t.status==='running'?'⏳':t.status==='done'?'✅':'❌';const e=t.endTime?((t.endTime-t.startTime)/1000).toFixed(1)+'s':((Date.now()-t.startTime)/1000).toFixed(0)+'s...';const rb=t.status!=='running'&&t.result?`<button class="task-result-toggle" onclick="toggleTaskResult(${t.id})">ver</button>`:'';return`<div class="task-item ${t.status}"><span class="task-status-icon">${icon}</span><span class="task-name">/${t.subAgent}: ${t.name}</span><span class="task-time">${e}</span>${rb}</div>${t.result?`<div class="task-result" id="taskResult${t.id}">${escapeHtml(t.result)}</div>`:''}`;}).join('');}
function toggleTaskResult(id){const el=document.getElementById(`taskResult${id}`);if(el)el.classList.toggle('open');}
function escapeHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
function addTaskMsg(text){if(activeConv!==null&&conversations[activeConv]){conversations[activeConv].messages.push({role:'task-msg',content:text});renderChat();saveConversations();}}

async function executeSubAgentTask(sa,task,taskId){
  const srvIdx=(sa.serverIndex!=null&&servers[sa.serverIndex])?sa.serverIndex:activeServer;
  if(srvIdx===null||!servers[srvIdx]){updateTask(taskId,'error',null,'Sem servidor');return;}
  const srv=servers[srvIdx];
  try{
    const messages=[{role:'system',content:sa.prompt||'Execute.'},{role:'user',content:task}];
    const body={messages,stream:true};if(srv.model)body.model=srv.model;if(sa.maxTokens)body.max_tokens=sa.maxTokens;if(sa.temperature!==undefined)body.temperature=sa.temperature;
    applyOllamaCompat(srv,body);
    const ctrl=new AbortController();const to=setTimeout(()=>ctrl.abort(),120000);
        const res=await llmChatFetch(srv, body, {signal:ctrl.signal});
    clearTimeout(to);if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const reader=res.body.getReader();const dec=new TextDecoder();let content='';
    while(true){const{done,value}=await reader.read();if(done)break;const chunk=dec.decode(value,{stream:true});for(const line of chunk.split('\n')){if(line.startsWith('data: ')){const d=line.slice(6).trim();if(d==='[DONE]')continue;try{content+=JSON.parse(d).choices?.[0]?.delta?.content||'';}catch(e){}}}}
    updateTask(taskId,'done',content,null);
  }catch(err){updateTask(taskId,'error',null,err.name==='AbortError'?'Timeout':await explainFetchError(err,srv.url));}
}

function parseSubAgentCommand(text){const m=text.match(/^\/([a-zA-Z0-9_-]+)\s+(.+)$/s);if(!m)return null;const sa=subAgents.find(s=>s.name.toLowerCase()===m[1].toLowerCase());if(!sa)return null;return{subAgent:sa,task:m[2].trim()};}

// ===== SUB-AGENTS / AGENTS / SKILLS / SERVERS =====
function renderSubAgents(){document.getElementById('subAgentList').innerHTML=subAgents.map((sa,i)=>`<div class="subagent-item"><div class="subagent-info"><span class="subagent-name">${sa.icon?sa.icon+' ':''}${sa.name}</span><span class="subagent-cmd">/${sa.name} tarefa...</span><span class="subagent-desc">${sa.desc||''}</span></div><div class="item-actions"><button onclick="editSubAgent(${i})">✏️</button><button onclick="deleteSubAgent(${i})">🗑</button></div></div>`).join('');}
function openSubAgentModal(){editingSubAgentIndex=null;clearSubAgentForm();populateSubAgentSelects();document.getElementById('modalSubAgentTitle').textContent='Criar Sub-Agente';openModal('modalSubAgent');}
function editSubAgent(i){const sa=subAgents[i];editingSubAgentIndex=i;populateSubAgentSelects();document.getElementById('subAgentName').value=sa.name||'';document.getElementById('subAgentDesc').value=sa.desc||'';document.getElementById('subAgentIcon').value=sa.icon||'';document.getElementById('subAgentPrompt').value=sa.prompt||'';document.getElementById('subAgentServer').value=sa.serverIndex??'';document.getElementById('subAgentTemp').value=sa.temperature||'';document.getElementById('subAgentMaxTokens').value=sa.maxTokens||'';document.getElementById('modalSubAgentTitle').textContent='Editar Sub-Agente';openModal('modalSubAgent');}
function cancelSubAgentModal(){editingSubAgentIndex=null;clearSubAgentForm();closeModal('modalSubAgent');}
function populateSubAgentSelects(){document.getElementById('subAgentServer').innerHTML='<option value="">— Ativo —</option>'+servers.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('');}
function saveSubAgent(){const name=document.getElementById('subAgentName').value.trim().replace(/[^a-zA-Z0-9_-]/g,'');const prompt=document.getElementById('subAgentPrompt').value.trim();if(!name||!prompt){alert('Obrigatório.');return;}if(subAgents.find((s,i)=>s.name.toLowerCase()===name.toLowerCase()&&i!==editingSubAgentIndex)){alert('Duplicado.');return;}const sv=document.getElementById('subAgentServer').value;const sa={name,desc:document.getElementById('subAgentDesc').value.trim()||undefined,icon:document.getElementById('subAgentIcon').value.trim()||undefined,prompt,serverIndex:sv!==''?parseInt(sv):null,temperature:parseFloat(document.getElementById('subAgentTemp').value)||undefined,maxTokens:parseInt(document.getElementById('subAgentMaxTokens').value)||undefined};if(editingSubAgentIndex!==null&&subAgents[editingSubAgentIndex])subAgents[editingSubAgentIndex]=sa;else subAgents.push(sa);localStorage.setItem('llama_subagents',JSON.stringify(subAgents));editingSubAgentIndex=null;renderSubAgents();closeModal('modalSubAgent');clearSubAgentForm();}
function deleteSubAgent(i){if(!confirm('Remover?'))return;subAgents.splice(i,1);localStorage.setItem('llama_subagents',JSON.stringify(subAgents));renderSubAgents();}
function clearSubAgentForm(){['subAgentName','subAgentDesc','subAgentIcon','subAgentPrompt','subAgentTemp','subAgentMaxTokens'].forEach(id=>document.getElementById(id).value='');document.getElementById('subAgentServer').value='';}

function renderAgents(){document.getElementById('agentList').innerHTML=agents.map((a,i)=>{const b=[];if(a.serverIndex!=null&&servers[a.serverIndex])b.push(`<span class="agent-badge">🖥 ${servers[a.serverIndex].name}</span>`);if(a.skillIndex!=null&&skills[a.skillIndex])b.push(`<span class="agent-badge">⚡ ${skills[a.skillIndex].name}</span>`);return`<div class="agent-item ${activeAgent===i?'active':''}" onclick="applyAgent(${i})"><div class="agent-info"><span class="agent-name">${a.icon?a.icon+' ':''}${a.name}</span><span class="agent-desc">${a.desc||''}</span>${b.length?`<div class="agent-badges">${b.join('')}</div>`:''}</div><div class="item-actions"><button onclick="event.stopPropagation();editAgent(${i})">✏️</button><button onclick="event.stopPropagation();deleteAgent(${i})">🗑</button></div></div>`;}).join('');}
function openAgentModal(){editingAgentIndex=null;clearAgentForm();populateAgentSelects();document.getElementById('modalAgentTitle').textContent='Criar Agente';openModal('modalAgent');}
function editAgent(i){const a=agents[i];editingAgentIndex=i;populateAgentSelects();document.getElementById('agentName').value=a.name||'';document.getElementById('agentDesc').value=a.desc||'';document.getElementById('agentIcon').value=a.icon||'';document.getElementById('agentPrompt').value=a.prompt||'';document.getElementById('agentServer').value=a.serverIndex??'';document.getElementById('agentSkill').value=a.skillIndex??'';document.getElementById('agentTemp').value=a.temperature||'';document.getElementById('agentMaxTokens').value=a.maxTokens||'';document.getElementById('agentTopP').value=a.topP||'';document.getElementById('agentMaxMsgs').value=a.maxMsgs||'';document.getElementById('modalAgentTitle').textContent='Editar Agente';openModal('modalAgent');}
function cancelAgentModal(){editingAgentIndex=null;clearAgentForm();closeModal('modalAgent');}
function populateAgentSelects(){document.getElementById('agentServer').innerHTML='<option value="">— Ativo —</option>'+servers.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('');document.getElementById('agentSkill').innerHTML='<option value="">— Nenhuma —</option>'+skills.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('');}
function saveAgent(){const name=document.getElementById('agentName').value.trim();const prompt=document.getElementById('agentPrompt').value.trim();if(!name||!prompt){alert('Obrigatório.');return;}const sv=document.getElementById('agentServer').value;const sk=document.getElementById('agentSkill').value;const a={name,desc:document.getElementById('agentDesc').value.trim()||undefined,icon:document.getElementById('agentIcon').value.trim()||undefined,prompt,serverIndex:sv!==''?parseInt(sv):null,skillIndex:sk!==''?parseInt(sk):null,temperature:parseFloat(document.getElementById('agentTemp').value)||undefined,maxTokens:parseInt(document.getElementById('agentMaxTokens').value)||undefined,topP:parseFloat(document.getElementById('agentTopP').value)||undefined,maxMsgs:parseInt(document.getElementById('agentMaxMsgs').value)||undefined};if(editingAgentIndex!==null&&agents[editingAgentIndex])agents[editingAgentIndex]=a;else agents.push(a);localStorage.setItem('llama_agents',JSON.stringify(agents));editingAgentIndex=null;renderAgents();closeModal('modalAgent');clearAgentForm();}
function deleteAgent(i){if(!confirm('Remover?'))return;agents.splice(i,1);if(activeAgent===i){activeAgent=null;updateAgentBadge();}else if(activeAgent>i)activeAgent--;localStorage.setItem('llama_agents',JSON.stringify(agents));renderAgents();}
function applyAgent(i){if(activeAgent===i){activeAgent=null;}else{activeAgent=i;const a=agents[i];if(a.serverIndex!=null&&servers[a.serverIndex]){activeServer=a.serverIndex;document.getElementById('activeServerName').textContent=servers[a.serverIndex].name;renderServers();}activeSkill=(a.skillIndex!=null&&skills[a.skillIndex])?a.skillIndex:null;updateSkillBadge();renderSkills();addSystemMsg(`${a.icon||'🤖'} Agente "${a.name}" ativado.`);}updateAgentBadge();renderAgents();}
function updateAgentBadge(){const b=document.getElementById('activeAgentBadge');if(activeAgent!==null&&agents[activeAgent]){b.textContent=`${agents[activeAgent].icon||'🤖'} ${agents[activeAgent].name}`;b.style.display='inline';}else b.style.display='none';}
function clearAgentForm(){['agentName','agentDesc','agentIcon','agentPrompt','agentTemp','agentMaxTokens','agentTopP','agentMaxMsgs'].forEach(id=>document.getElementById(id).value='');document.getElementById('agentServer').value='';document.getElementById('agentSkill').value='';}

function getActiveSystemPrompt(){if(activeAgent!==null&&agents[activeAgent])return agents[activeAgent].prompt;if(activeSkill!==null&&skills[activeSkill])return skills[activeSkill].prompt;if(activeServer!==null&&servers[activeServer]?.system)return servers[activeServer].system;return null;}
function getActiveTemperature(){if(activeAgent!==null&&agents[activeAgent]?.temperature!==undefined)return agents[activeAgent].temperature;if(activeSkill!==null&&skills[activeSkill]?.temperature!==undefined)return skills[activeSkill].temperature;if(activeServer!==null&&servers[activeServer]?.temperature!==undefined)return servers[activeServer].temperature;return undefined;}
function getActiveMaxTokens(){if(activeAgent!==null&&agents[activeAgent]?.maxTokens)return agents[activeAgent].maxTokens;if(activeServer!==null&&servers[activeServer]?.maxTokens)return servers[activeServer].maxTokens;return undefined;}
function getActiveTopP(){if(activeAgent!==null&&agents[activeAgent]?.topP!==undefined)return agents[activeAgent].topP;if(activeServer!==null&&servers[activeServer]?.topP!==undefined)return servers[activeServer].topP;return undefined;}
function getActiveMaxMsgs(){if(activeAgent!==null&&agents[activeAgent]?.maxMsgs)return agents[activeAgent].maxMsgs;if(activeServer!==null&&servers[activeServer]?.maxMsgs)return servers[activeServer].maxMsgs;return 20;}

function serverHeaders(srv,extra={}){
  const h={'Content-Type':'application/json',...extra};
  if(srv&&srv.apiKey){
    if(srv.apiKeyType==='x-api-key')h['x-api-key']=srv.apiKey;
    else if(srv.apiKeyType==='api-key')h['api-key']=srv.apiKey;
    else h['Authorization']='Bearer '+srv.apiKey;
  }
  return h;
}
// ===== RELAY CORS (lama.php?action=llm_relay) =====
const LLM_RELAY=location.pathname+(location.search?location.search+'&':'?')+'action=llm_relay';
function llmUpstream(srv,path){return `${srv.url.replace(/\/+$/,'')}${path}`;}
async function llmChatFetch(srv,body,opts={}){
  if(!srv?.proxy)return fetch(llmUpstream(srv,'/v1/chat/completions'),{method:'POST',headers:serverHeaders(srv),body:JSON.stringify(body),...opts});
  const rb={upstream:llmUpstream(srv,'/v1/chat/completions'),apiKey:srv.apiKey,apiKeyType:srv.apiKeyType,method:'POST',payload:body};
  return fetch(LLM_RELAY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(rb),...opts});
}
async function llmModelsFetch(srv,opts={}){
  if(!srv?.proxy)return fetch(llmUpstream(srv,'/v1/models'),{headers:serverHeaders(srv),...opts});
  const rb={upstream:llmUpstream(srv,'/v1/models'),apiKey:srv.apiKey,apiKeyType:srv.apiKeyType,method:'GET',payload:{}};
  return fetch(LLM_RELAY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(rb),...opts});
}
function toggleSrvApiKey(){const el=document.getElementById('srvApiKey');if(!el)return;el.type=el.type==='password'?'text':'password';}
function getSrvApiKeyType(){const el=document.getElementById('srvApiKeyType');return el?el.value:'bearer';}
async function detectModelFromURL(u,srv){u=u.trim().replace(/\/+$/,'');if(!u)return null;if(srv&&srv.proxy){try{const r=await llmModelsFetch(srv,{signal:AbortSignal.timeout(6000)});if(r.ok){const d=await r.json();if(d.data?.[0]?.id)return d.data[0].id;}}catch(e){}return null;}try{const r=await fetch(`${u}/v1/models`,{headers:serverHeaders(srv),signal:AbortSignal.timeout(6000)});if(r.ok){const d=await r.json();if(d.data?.[0]?.id)return d.data[0].id;}}catch(e){}try{const r=await fetch(`${u}/slots`,{headers:serverHeaders(srv),signal:AbortSignal.timeout(6000)});if(r.ok){const s=await r.json();if(s[0]?.model)return s[0].model;}}catch(e){}return null;}

// ===== ORQUESTRADORES =====
function renderOrchestrators(){
  const el=document.getElementById('orchList');
  el.innerHTML=orchestrators.map((o,i)=>{
    const modeLabel={sequential:'Seq',parallel:'Par',pipeline:'Pipe'}[o.mode]||o.mode;
    const modeClass={sequential:'mode-seq',parallel:'mode-par',pipeline:'mode-pipe'}[o.mode]||'';
    const badges=[];
    badges.push(`<span class="orch-badge ${modeClass}">${modeLabel}</span>`);
    if(o.serverIndex!=null&&servers[o.serverIndex])badges.push(`<span class="orch-badge">🖥 ${servers[o.serverIndex].name}</span>`);
    if(o.agentIndex!=null&&agents[o.agentIndex])badges.push(`<span class="orch-badge">🤖 ${agents[o.agentIndex].name}</span>`);
    if(o.skillIndex!=null&&skills[o.skillIndex])badges.push(`<span class="orch-badge">⚡ ${skills[o.skillIndex].name}</span>`);
    if(o.steps&&o.steps.length)badges.push(`<span class="orch-badge">📋 ${o.steps.length} etapa(s)</span>`);
    const active=activeOrch===i;
    return`<div class="orch-item ${active?'active':''}" onclick="applyOrch(${i})"><div class="orch-info"><span class="orch-name">${o.icon||'🔗'} ${o.name}${active?'<span class="orch-active-indicator">ATIVO</span>':''}</span><span class="orch-desc">${o.desc||''}</span>${badges.length?`<div class="orch-badges">${badges.join('')}</div>`:''}</div><div class="item-actions"><button onclick="event.stopPropagation();editOrch(${i})">✏️</button><button onclick="event.stopPropagation();deleteOrch(${i})">🗑</button></div></div>`;
  }).join('');
}

function openOrchModal(){
  editingOrchIndex=null;clearOrchForm();populateOrchSelects();
  document.getElementById('modalOrchTitle').textContent='Criar Orquestrador';
  openModal('modalOrch');
}
function editOrch(i){
  const o=orchestrators[i];editingOrchIndex=i;populateOrchSelects();
  document.getElementById('orchName').value=o.name||'';
  document.getElementById('orchDesc').value=o.desc||'';
  document.getElementById('orchIcon').value=o.icon||'';
  document.getElementById('orchMode').value=o.mode||'sequential';
  document.getElementById('orchServer').value=o.serverIndex??'';
  document.getElementById('orchAgent').value=o.agentIndex??'';
  document.getElementById('orchSkill').value=o.skillIndex??'';
  document.getElementById('orchPrompt').value=o.systemPrompt||'';
  document.getElementById('orchTemp').value=o.temperature||'';
  document.getElementById('orchMaxTokens').value=o.maxTokens||'';
  document.getElementById('orchTopP').value=o.topP||'';
  document.querySelectorAll('#orchSubAgents input[type="checkbox"]').forEach(cb=>{cb.checked=(o.subAgentIndices||[]).includes(parseInt(cb.value));});
  document.querySelectorAll('#orchMCPs input[type="checkbox"]').forEach(cb=>{cb.checked=(o.mcpIndices||[]).includes(parseInt(cb.value));});
  renderOrchSteps(o.steps||[]);
  document.getElementById('modalOrchTitle').textContent='Editar Orquestrador';
  openModal('modalOrch');
}
function cancelOrchModal(){editingOrchIndex=null;clearOrchForm();closeModal('modalOrch');}
function populateOrchSelects(){
  document.getElementById('orchServer').innerHTML='<option value="">— Ativo —</option>'+servers.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('');
  document.getElementById('orchAgent').innerHTML='<option value="">— Nenhum —</option>'+agents.map((a,i)=>`<option value="${i}">${a.icon||'🤖'} ${a.name}</option>`).join('');
  document.getElementById('orchSkill').innerHTML='<option value="">— Nenhuma —</option>'+skills.map((s,i)=>`<option value="${i}">${s.icon||'⚡'} ${s.name}</option>`).join('');
  document.getElementById('orchSubAgents').innerHTML=subAgents.map((sa,i)=>`<label><input type="checkbox" value="${i}" ${sa.icon?'checked':''}> ${sa.icon||'🎯'} ${sa.name}</label>`).join('');
  document.getElementById('orchMCPs').innerHTML=mcps.map((m,i)=>`<label><input type="checkbox" value="${i}" checked> ${m.name}</label>`).join('');
}
function renderOrchSteps(steps){
  const el=document.getElementById('orchSteps');
  el.innerHTML=steps.map((s,i)=>{
    const typeOpts=`<option value="prompt" ${s.type==='prompt'?'selected':''}>Prompt</option><option value="agent" ${s.type==='agent'?'selected':''}>Agente</option><option value="subagent" ${s.type==='subagent'?'selected':''}>Sub-Agente</option><option value="skill" ${s.type==='skill'?'selected':''}>Skill</option><option value="mcp" ${s.type==='mcp'?'selected':''}>MCP</option>`;
    let nameInput='';
    if(s.type==='agent')nameInput=`<select class="step-name-sel">${agents.map((a,j)=>`<option value="${j}" ${s.index==j?'selected':''}>${a.icon||'🤖'} ${a.name}</option>`).join('')}</select>`;
    else if(s.type==='subagent')nameInput=`<select class="step-name-sel">${subAgents.map((sa,j)=>`<option value="${j}" ${s.index==j?'selected':''}>${sa.icon||'🎯'} ${sa.name}</option>`).join('')}</select>`;
    else if(s.type==='skill')nameInput=`<select class="step-name-sel">${skills.map((sk,j)=>`<option value="${j}" ${s.index==j?'selected':''}>${sk.icon||'⚡'} ${sk.name}</option>`).join('')}</select>`;
    else if(s.type==='mcp')nameInput=`<select class="step-name-sel">${mcps.map((m,j)=>`<option value="${j}" ${s.index==j?'selected':''}>${m.name}</option>`).join('')}</select>`;
    else nameInput=`<input type="text" class="step-text-input" value="${escapeHtml(s.text||'')}" placeholder="Instrução para esta etapa...">`;
    return`<div class="orch-step" data-idx="${i}"><span class="orch-step-num">${i+1}</span><select class="step-type-sel" onchange="orchStepTypeChanged(${i},this.value)">${typeOpts}</select>${nameInput}<button class="btn small" onclick="removeOrchStep(${i})">✕</button></div>`;
  }).join('');
}
function addOrchStep(){
  const steps=getOrchStepsFromDOM();
  steps.push({type:'prompt',text:''});
  renderOrchSteps(steps);
}
function removeOrchStep(i){
  const steps=getOrchStepsFromDOM();
  steps.splice(i,1);
  renderOrchSteps(steps);
}
function orchStepTypeChanged(i,type){
  const steps=getOrchStepsFromDOM();
  if(type==='prompt')steps[i]={type:'prompt',text:steps[i].text||''};
  else steps[i]={type,index:0,name:''};
  renderOrchSteps(steps);
}
function getOrchStepsFromDOM(){
  const el=document.getElementById('orchSteps');
  const steps=[];
  el.querySelectorAll('.orch-step').forEach(row=>{
    const type=row.querySelector('.step-type-sel').value;
    if(type==='prompt'){
      const txt=row.querySelector('.step-text-input');
      steps.push({type,text:txt?txt.value:''});
    }else{
      const sel=row.querySelector('.step-name-sel');
      steps.push({type,index:sel?parseInt(sel.value):0,name:sel?sel.options[sel.selectedIndex]?.text:''});
    }
  });
  return steps;
}
function saveOrch(){
  const name=document.getElementById('orchName').value.trim();
  if(!name){alert('Obrigatório.');return;}
  const sv=document.getElementById('orchServer').value;
  const ag=document.getElementById('orchAgent').value;
  const sk=document.getElementById('orchSkill').value;
  const subChecks=document.querySelectorAll('#orchSubAgents input[type="checkbox"]:checked');
  const mcpChecks=document.querySelectorAll('#orchMCPs input[type="checkbox"]:checked');
  const o={
    name,
    desc:document.getElementById('orchDesc').value.trim()||undefined,
    icon:document.getElementById('orchIcon').value.trim()||undefined,
    mode:document.getElementById('orchMode').value,
    serverIndex:sv!==''?parseInt(sv):null,
    agentIndex:ag!==''?parseInt(ag):null,
    skillIndex:sk!==''?parseInt(sk):null,
    subAgentIndices:[...subChecks].map(cb=>parseInt(cb.value)),
    mcpIndices:[...mcpChecks].map(cb=>parseInt(cb.value)),
    systemPrompt:document.getElementById('orchPrompt').value.trim()||undefined,
    temperature:parseFloat(document.getElementById('orchTemp').value)||undefined,
    maxTokens:parseInt(document.getElementById('orchMaxTokens').value)||undefined,
    topP:parseFloat(document.getElementById('orchTopP').value)||undefined,
    steps:getOrchStepsFromDOM()
  };
  if(editingOrchIndex!==null&&orchestrators[editingOrchIndex])orchestrators[editingOrchIndex]=o;
  else orchestrators.push(o);
  localStorage.setItem('llama_orchestrators',JSON.stringify(orchestrators));
  editingOrchIndex=null;renderOrchestrators();closeModal('modalOrch');clearOrchForm();
}
function deleteOrch(i){if(!confirm(`Remover "${orchestrators[i].name}"?`))return;orchestrators.splice(i,1);if(activeOrch===i)activeOrch=null;else if(activeOrch>i)activeOrch--;localStorage.setItem('llama_orchestrators',JSON.stringify(orchestrators));renderOrchestrators();}
function applyOrch(i){
  if(activeOrch===i){activeOrch=null;addSystemMsg('🔗 Orquestrador desativado.');updateOrchBadge();renderOrchestrators();return;}
  activeOrch=i;
  const o=orchestrators[i];
  if(o.serverIndex!=null&&servers[o.serverIndex]){activeServer=o.serverIndex;document.getElementById('activeServerName').textContent=servers[o.serverIndex].name;renderServers();}
  if(o.agentIndex!=null&&agents[o.agentIndex]){activeAgent=o.agentIndex;updateAgentBadge();renderAgents();}
  if(o.skillIndex!=null&&skills[o.skillIndex]){activeSkill=o.skillIndex;updateSkillBadge();renderSkills();}
  addSystemMsg(`${o.icon||'🔗'} Orquestrador "${o.name}" ativado. Modo: ${o.mode}.`);
  updateOrchBadge();renderOrchestrators();
}
function updateOrchBadge(){const b=document.getElementById('activeOrchBadge');if(activeOrch!==null&&orchestrators[activeOrch]){b.textContent=`${orchestrators[activeOrch].icon||'🔗'} ${orchestrators[activeOrch].name}`;b.style.display='inline';}else b.style.display='none';}
function clearOrchForm(){
  ['orchName','orchDesc','orchIcon','orchPrompt','orchTemp','orchMaxTokens','orchTopP'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('orchMode').value='sequential';
  document.getElementById('orchServer').value='';
  document.getElementById('orchAgent').value='';
  document.getElementById('orchSkill').value='';
  document.querySelectorAll('#orchSubAgents input[type="checkbox"]').forEach(cb=>cb.checked=false);
  document.querySelectorAll('#orchMCPs input[type="checkbox"]').forEach(cb=>cb.checked=true);
  renderOrchSteps([]);
}

async function executeOrchestrator(o,userMessage){
  if(activeConv===null)newConversation();
  const conv=conversations[activeConv];
  const srvIdx=o.serverIndex!=null&&servers[o.serverIndex]?o.serverIndex:activeServer;
  if(srvIdx===null||!servers[srvIdx]){addSystemMsg('❌ Orquestrador: sem servidor.');return;}
  const srv=servers[srvIdx];
  const steps=o.steps||[];
  if(!steps.length){addSystemMsg('❌ Orquestrador: sem etapas definidas.');return;}

  addSystemMsg(`${o.icon||'🔗'} Executando "${o.name}" (${o.mode}) — ${steps.length} etapa(s)...`);

  const mode=o.mode||'sequential';
  const allResults=[];
  const systemPrompt=o.systemPrompt||`Você é um orquestrador. Coordene as etapas para atender ao pedido do usuário.`;
  const mcpTools=getActiveMCPTools();
  const toolsForAPI=mcpTools.map(({_mcpIndex,...t})=>t);
  console.log('[Orch] Tools disponíveis:',toolsForAPI.length,toolsForAPI.map(t=>t.function?.name));

  async function runStep(step,prevResult){
    let prompt=systemPrompt+'\n\n';
    if(prevResult)prompt+=`Resultado da etapa anterior:\n${prevResult}\n\n`;
    prompt+=`Pedido do usuário: ${userMessage}`;
    if(step.type==='prompt')prompt+='\n\n'+(step.text||'');
    else if(step.type==='agent'&&agents[step.index])prompt=agents[step.index].prompt+'\n\n'+prompt;
    else if(step.type==='subagent'&&subAgents[step.index])prompt=subAgents[step.index].prompt+'\n\n'+prompt;
    else if(step.type==='skill'&&skills[step.index])prompt=skills[step.index].prompt+'\n\n'+prompt;

    let messages=[{role:'system',content:prompt},{role:'user',content:userMessage}];
    let content='';let iteration=0;const maxIter=8;
    while(iteration<maxIter){
      iteration++;
      try{
        const body={messages,stream:false};
        if(srv.model)body.model=srv.model;
        if(o.maxTokens)body.max_tokens=o.maxTokens;
        if(o.temperature!==undefined)body.temperature=o.temperature;
        if(o.topP!==undefined)body.top_p=o.topP;
        if(toolsForAPI.length>0){body.tools=sanitizeToolsForOllama(toolsForAPI);body.tool_choice='auto';}
        applyOllamaCompat(srv,body);
        const ctrl=new AbortController();const to=setTimeout(()=>ctrl.abort(),120000);
    const res=await llmChatFetch(srv, body, {signal:ctrl.signal});
        clearTimeout(to);if(!res.ok)throw new Error(`HTTP ${res.status}`);
        const data=await res.json();
        const msg=data.choices?.[0]?.message||{};
        const resultContent=msg.content||'';
        const tool_calls=msg.tool_calls||[];
        if(tool_calls.length>0){
          messages.push({role:'assistant',content:resultContent,tool_calls});
          for(const tc of tool_calls){
            const fn=tc.function.name;let args={};try{args=JSON.parse(tc.function.arguments||'{}');}catch(e){}
            addToolMsg(`🔧 ${fn}(${JSON.stringify(args).substring(0,120)})`);
            const toolEntry=mcpTools.find(t=>t.function.name===fn);
            let toolResult='';
            if(toolEntry){try{toolResult=await executeMCPToolByIndex(toolEntry._mcpIndex,fn,args);}catch(err){toolResult=`Erro: ${err.message}`;}}
            else toolResult='Erro: Ferramenta não encontrada.';
            messages.push({role:'tool',tool_call_id:tc.id,content:toolResult});
            addToolResultMsg(fn,toolResult);
          }
          saveConversations();renderChat();continue;
        }
        content=resultContent;
        break;
      }catch(err){return`[Erro: ${await explainFetchError(err,srv.url)}]`;}
    }
    return content||'(vazio)';
  }

  if(mode==='sequential'||mode==='pipeline'){
    let prev='';
    for(let i=0;i<steps.length;i++){
      addSystemMsg(`📋 Etapa ${i+1}/${steps.length}: ${steps[i].type}`);
      const result=await runStep(steps[i],prev);
      allResults.push({step:i+1,type:steps[i].type,result});
      if(mode==='pipeline')prev=result;
    }
  }else if(mode==='parallel'){
    addSystemMsg(`📋 Executando ${steps.length} etapas em paralelo...`);
    const promises=steps.map((s,i)=>runStep(s,'').then(r=>({step:i+1,type:s.type,result:r})));
    const results=await Promise.all(promises);
    allResults.push(...results);
  }

  const summary=allResults.map(r=>`**Etapa ${r.step} (${r.type}):**\n${r.result}`).join('\n\n---\n\n');
  conv.messages.push({role:'assistant',content:`${o.icon||'🔗'} **${o.name}** — Resultado:\n\n${summary}`,speed:'0',tokens:0,time:'0',usage:{prompt_tokens:0,completion_tokens:0}});
  saveConversations();renderChat();
}

function clearAll(){if(!confirm('⚠️ Apagar TUDO?'))return;servers=[];conversations=[];skills=[];agents=[];subAgents=[];mcps=[];orchestrators=[];mcpStatus={};mcpToolsCache={};mmcpToolsCache=[];activeServer=null;activeConv=null;activeSkill=null;activeAgent=null;activeOrch=null;backgroundTasks=[];stats={inputTokens:0,outputTokens:0,totalTime:0,requests:0};['llama_servers','llama_convs','llama_skills','llama_agents','llama_subagents','llama_mcps','llama_stats','llama_workspace_files','llama_orchestrators','mmcp_enabled'].forEach(k=>localStorage.removeItem(k));document.getElementById('activeServerName').textContent='Nenhum';document.getElementById('activeSkillBadge').style.display='none';document.getElementById('activeAgentBadge').style.display='none';renderServers();renderConversations();renderSkills();renderAgents();renderSubAgents();renderMCPs();renderOrchestrators();renderChat();renderTasks();updateStatsDisplay();}
async function logoff(){
  if(abortController)try{abortController.abort();}catch(e){}
  activeServer=null;activeConv=null;activeSkill=null;activeAgent=null;activeOrch=null;
  pendingAttachments=[];renderAttachPreview();
  document.getElementById('activeServerName').textContent='Nenhum';
  document.getElementById('activeServerSelect').value='';
  document.getElementById('activeSkillBadge').style.display='none';
  document.getElementById('activeAgentBadge').style.display='none';
  document.getElementById('activeOrchBadge').style.display='none';
  document.getElementById('userInput').value='';
  stats={inputTokens:0,outputTokens:0,totalTime:0,requests:0};localStorage.setItem('llama_stats',JSON.stringify(stats));updateStatsDisplay();
  renderServers();renderConversations();renderSkills();renderAgents();renderSubAgents();renderMCPs();renderOrchestrators();renderChat();renderTasks();
  try{ await fetch(location.pathname+(location.search?'&':'?')+'action=logout',{method:'POST'}); }catch(e){}
  location.href=location.pathname+location.search;
}

function renderSkills(){document.getElementById('skillList').innerHTML=skills.map((s,i)=>`<div class="skill-item ${activeSkill===i?'active':''}" onclick="applySkill(${i})"><div class="skill-info"><span class="skill-name">${s.icon?s.icon+' ':''}${s.name}</span><span class="skill-preview">${(s.prompt||'').substring(0,60)}...</span></div><div class="item-actions"><button onclick="event.stopPropagation();editSkill(${i})">✏️</button><button onclick="event.stopPropagation();deleteSkill(${i})">🗑</button></div></div>`).join('');}
function openSkillModal(){editingSkillIndex=null;clearSkillForm();document.getElementById('modalSkillTitle').textContent='Adicionar Skill';openModal('modalSkill');}
function editSkill(i){const s=skills[i];editingSkillIndex=i;document.getElementById('skillName').value=s.name||'';document.getElementById('skillPrompt').value=s.prompt||'';document.getElementById('skillTemp').value=s.temperature||'';document.getElementById('skillIcon').value=s.icon||'';document.getElementById('modalSkillTitle').textContent='Editar Skill';openModal('modalSkill');}
function cancelSkillModal(){editingSkillIndex=null;clearSkillForm();closeModal('modalSkill');}
function saveSkill(){const n=document.getElementById('skillName').value.trim();const p=document.getElementById('skillPrompt').value.trim();if(!n||!p){alert('Obrigatório.');return;}const s={name:n,prompt:p,temperature:parseFloat(document.getElementById('skillTemp').value)||undefined,icon:document.getElementById('skillIcon').value.trim()||undefined};if(editingSkillIndex!==null&&skills[editingSkillIndex])skills[editingSkillIndex]=s;else skills.push(s);localStorage.setItem('llama_skills',JSON.stringify(skills));editingSkillIndex=null;renderSkills();closeModal('modalSkill');clearSkillForm();}
function deleteSkill(i){if(!confirm('Remover?'))return;skills.splice(i,1);if(activeSkill===i){activeSkill=null;updateSkillBadge();}else if(activeSkill>i)activeSkill--;localStorage.setItem('llama_skills',JSON.stringify(skills));renderSkills();}
function applySkill(i){activeSkill=(activeSkill===i)?null:i;updateSkillBadge();renderSkills();}
function updateSkillBadge(){const b=document.getElementById('activeSkillBadge');if(activeSkill!==null&&skills[activeSkill]){b.textContent=`${skills[activeSkill].icon||'⚡'} ${skills[activeSkill].name}`;b.style.display='inline';}else b.style.display='none';}
function clearSkillForm(){['skillName','skillPrompt','skillTemp','skillIcon'].forEach(id=>document.getElementById(id).value='');}

function updateServerSelect(){const sel=document.getElementById('activeServerSelect');sel.innerHTML='<option value="">— Nenhum —</option>'+servers.map((s,i)=>`<option value="${i}">${escapeHtml(s.name)}</option>`).join('');sel.value=activeServer!==null?String(activeServer):'';}
function renderServers(){updateServerSelect();document.getElementById('serverList').innerHTML=servers.map((s,i)=>`<div class="server-item ${activeServer===i?'active':''}" onclick="selectServer(${i})"><div class="server-info"><span class="server-title">${s.name}${s.fallbacks&&s.fallbacks.length?` <span class="mcp-badge">🔁 ${s.fallbacks.length}</span>`:''}${s.ollama?' <span class="mcp-badge">🦙</span>':''}</span>${s.model?`<span class="server-model">${s.model}</span>`:''}</div><div class="item-actions"><button onclick="event.stopPropagation();editServer(${i})">✏️</button><button onclick="event.stopPropagation();deleteServer(${i})">🗑</button></div></div>`).join('');}
function selectServer(i){if(i==null||isNaN(i)||!servers[i]){activeServer=null;document.getElementById('activeServerName').textContent='Nenhum';renderServers();return;}activeServer=i;document.getElementById('activeServerName').textContent=servers[i].name;renderServers();}
function toggleServerAdvanced(){
  const fields=document.getElementById('serverAdvancedFields');
  const toggle=fields.previousElementSibling;
  const collapsed=fields.classList.toggle('collapsed');
  toggle.classList.toggle('open',!collapsed);
  localStorage.setItem('llama_server_advanced_collapsed',JSON.stringify(collapsed));
}
function applyServerAdvancedState(){
  const fields=document.getElementById('serverAdvancedFields');
  if(!fields)return;
  const toggle=fields.previousElementSibling;
  let collapsed=true;
  try{collapsed=JSON.parse(localStorage.getItem('llama_server_advanced_collapsed'))??true;}catch(e){}
  fields.classList.toggle('collapsed',collapsed);
  toggle.classList.toggle('open',!collapsed);
}
function openServerModal(){applyServerAdvancedState();editingServerIndex=null;clearServerForm();populateServerFallbacks();document.getElementById('modalServerTitle').textContent='Adicionar Servidor';openModal('modalServer');}
function editServer(i){const s=servers[i];editingServerIndex=i;applyServerAdvancedState();document.getElementById('srvName').value=s.name||'';document.getElementById('srvURL').value=s.url||'';document.getElementById('srvModel').value=s.model||'';document.getElementById('srvMaxTokens').value=s.maxTokens||'';document.getElementById('srvNCtx').value=s.nCtx||'';document.getElementById('srvMaxMsgs').value=s.maxMsgs||20;document.getElementById('srvTemp').value=s.temperature||'';document.getElementById('srvTopP').value=s.topP||'';document.getElementById('srvSystem').value=s.system||'';document.getElementById('srvApiKey').value=s.apiKey||'';document.getElementById('srvApiKey').type='password';document.getElementById('srvApiKeyType').value=s.apiKeyType||'bearer';document.getElementById('srvProxy').checked=!!(s.proxy);document.getElementById('srvOllama').checked=!!(s.ollama);populateServerFallbacks();document.getElementById('modalServerTitle').textContent='Editar Servidor';openModal('modalServer');}
function cancelServerModal(){editingServerIndex=null;clearServerForm();closeModal('modalServer');}
function saveServer(){const n=document.getElementById('srvName').value.trim();const u=document.getElementById('srvURL').value.trim();if(!n||!u){alert('Obrigatório.');return;}const cleanU=u.replace(/\/+$/,'');const normUrl=u=>{const s=u||'';return s.replace(/\/+$/,'').toLowerCase();};const dup=servers.findIndex((s,i)=>i!==editingServerIndex&&normUrl(s.url)===normUrl(cleanU));if(dup!==-1){alert(`⚠ Servidor já cadastrado: "${servers[dup].name}" (${cleanU})`);return;}const apiKey=document.getElementById('srvApiKey').value.trim();const fallbacks=srvFallbackOrder.filter(i=>servers[i]&&i!==editingServerIndex);const s={name:n,url:cleanU,model:document.getElementById('srvModel').value.trim()||undefined,maxTokens:parseInt(document.getElementById('srvMaxTokens').value)||undefined,nCtx:parseInt(document.getElementById('srvNCtx').value)||undefined,maxMsgs:parseInt(document.getElementById('srvMaxMsgs').value)||20,temperature:parseFloat(document.getElementById('srvTemp').value)||undefined,topP:parseFloat(document.getElementById('srvTopP').value)||undefined,system:document.getElementById('srvSystem').value.trim()||undefined,fallbacks:fallbacks.length?fallbacks:undefined};if(apiKey){s.apiKey=apiKey;s.apiKeyType=getSrvApiKeyType();}if(document.getElementById('srvProxy').checked)s.proxy=true;if(document.getElementById('srvOllama').checked)s.ollama=true;if(editingServerIndex!==null&&servers[editingServerIndex])servers[editingServerIndex]=s;else servers.push(s);localStorage.setItem('llama_servers',JSON.stringify(servers));editingServerIndex=null;renderServers();closeModal('modalServer');clearServerForm();}
async function checkServerOnline(s){
  const u=(s.url||'').replace(/\/+$/,'');
  if(!u)return false;
  try{const r= s.proxy ? await llmModelsFetch(s,{signal:AbortSignal.timeout(4000)}) : await fetch(`${u}/v1/models`,{headers:serverHeaders(s),signal:AbortSignal.timeout(4000)});if(r.ok||r.status===401||r.status===403)return true;}catch(e){}
  try{const {response}=await fetchWithCORFallback(`${u}/v1/models`,{},5000);return response.ok||response.status===401||response.status===403;}catch(e){}
  return false;
}
async function removeDuplicateServers(){
  if(!confirm('Retirar servidores repetidos (mesma URL) e verificar se estão online?'))return;
  const key=s=>(s.url||s.name||'').replace(/\/+$/,'').toLowerCase();
  const first=new Map();const toRemove=new Set();
  servers.forEach((s,i)=>{const k=key(s);if(first.has(k))toRemove.add(i);else first.set(k,i);});
  let removedDups=toRemove.size;
  const pruneIndices=(idxSet)=>{
    if(!idxSet.size)return;
    const remap={};let newIdx=0;
    servers.forEach((s,i)=>{if(!idxSet.has(i)){remap[i]=newIdx;newIdx++;}});
    servers=servers.filter((s,i)=>!idxSet.has(i));
    if(activeServer!==null){if(idxSet.has(activeServer))activeServer=null;else activeServer=remap[activeServer];}
    agents.forEach(a=>{if(a.serverIndex!=null)a.serverIndex=idxSet.has(a.serverIndex)?null:remap[a.serverIndex];});
    subAgents.forEach(sa=>{if(sa.serverIndex!=null)sa.serverIndex=idxSet.has(sa.serverIndex)?null:remap[sa.serverIndex];});
    servers.forEach(s=>{if(Array.isArray(s.fallbacks))s.fallbacks=s.fallbacks.filter(f=>!idxSet.has(f)&&remap[f]!==undefined).map(f=>remap[f]);});
    localStorage.setItem('llama_servers',JSON.stringify(servers));
    localStorage.setItem('llama_agents',JSON.stringify(agents));
    localStorage.setItem('llama_subagents',JSON.stringify(subAgents));
  };
  pruneIndices(toRemove);
  renderServers();renderAgents();renderSubAgents();
  // verifica status online de cada servidor restante
  const status=new Array(servers.length).fill(null);
  for(let i=0;i<servers.length;i++){status[i]=await checkServerOnline(servers[i]);renderServers();}
  const offline=status.map((ok,i)=>ok?null:i).filter(i=>i!==null);
  let msg=`🗑 ${removedDups} servidor(es) repetido(s) removido(s).\n\n📡 Status (${servers.length}):\n`+servers.map((s,i)=>`${status[i]?'✅':'❌'} ${s.name} — ${s.url}`).join('\n');
  if(!servers.length)msg+= '(nenhum)';
  if(offline.length&&confirm(msg+`\n\n❌ ${offline.length} offline. Deseja remover o(s) servidor(es) offline?`)){
    pruneIndices(new Set(offline));
    renderServers();renderAgents();renderSubAgents();
    alert(`🗑 ${offline.length} servidor(es) offline removido(s).`);
    return;
  }
  alert(msg);
}
function deleteServer(i){if(!confirm('Remover?'))return;servers.splice(i,1);if(activeServer===i){activeServer=null;document.getElementById('activeServerName').textContent='Nenhum';}else if(activeServer>i)activeServer--;servers.forEach(s=>{if(Array.isArray(s.fallbacks))s.fallbacks=s.fallbacks.filter(f=>f!==i).map(f=>f>i?f-1:f).filter(f=>servers[f]);});localStorage.setItem('llama_servers',JSON.stringify(servers));renderServers();}
function clearServerForm(){['srvName','srvURL','srvModel','srvMaxTokens','srvNCtx','srvTemp','srvTopP','srvSystem','srvApiKey'].forEach(id=>document.getElementById(id).value='');document.getElementById('srvMaxMsgs').value='20';document.getElementById('srvApiKeyType').value='bearer';document.getElementById('srvProxy').checked=false;document.getElementById('srvOllama').checked=false;document.getElementById('srvApiKey').type='password';document.getElementById('modelStatus').textContent='';hideModelSelect();}
let srvFallbackOrder=[];
function populateServerFallbacks(){
  const box=document.getElementById('srvFallbacks');if(!box)return;
  const sel=new Set((editingServerIndex!==null&&servers[editingServerIndex]?.fallbacks)||[]);
  srvFallbackOrder=(editingServerIndex!==null&&servers[editingServerIndex]?.fallbacks)||[];
  const others=servers.filter((s,i)=>i!==editingServerIndex&&!sel.has(i));
  renderFallbackList();
}
function renderFallbackList(){
  const box=document.getElementById('srvFallbacks');if(!box)return;
  const sel=new Set(srvFallbackOrder);
  let html='<div class="fallback-list">';
  srvFallbackOrder.forEach((i,pos)=>{
    const s=servers[i];if(!s)return;
    html+=`<div class="fallback-item"><span class="fallback-reorder">${pos>0?`<button type="button" class="btn small" onclick="srvFallbackMove(${pos},-1)">↑</button>`:''}${pos<srvFallbackOrder.length-1?`<button type="button" class="btn small" onclick="srvFallbackMove(${pos},1)">↓</button>`:''}</span><input type="hidden" value="${i}"><span class="fallback-label">${escapeHtml(s.name)}${s.model?` <span class="mention-desc">(${escapeHtml(s.model)})</span>`:''}</span></div>`;
  });
  html+='</div><div class="fallback-available">';
  servers.forEach((s,i)=>{
    if(i===editingServerIndex||sel.has(i))return;
    const checked=sel.has(i)?'checked':'';
    html+=`<label><input type="checkbox" value="${i}" ${checked} onchange="srvFallbackToggle(${i},this.checked)"> ${escapeHtml(s.name)}${s.model?` <span class="mention-desc">(${escapeHtml(s.model)})</span>`:''}</label>`;
  });
  html+='</div>';
  if(!srvFallbackOrder.length&&!servers.some((s,i)=>i!==editingServerIndex))html='<span class="hint">Nenhum servidor disponível para reserva.</span>';
  box.innerHTML=html;
}
function srvFallbackToggle(idx,checked){
  if(checked){if(!srvFallbackOrder.includes(idx))srvFallbackOrder.push(idx);}
  else srvFallbackOrder=srvFallbackOrder.filter(i=>i!==idx);
  renderFallbackList();
}
function srvFallbackMove(pos,dir){
  const i=srvFallbackOrder.splice(pos,1)[0];
  srvFallbackOrder.splice(pos+dir,0,i);
  renderFallbackList();
}
function hideModelSelect(){const s=document.getElementById('srvModelSelect');s.style.display='none';s.innerHTML='';}
function pickDetectedModel(v){if(!v)return;document.getElementById('srvModel').value=v;document.getElementById('modelStatus').textContent=`✓ ${v}`;document.getElementById('modelStatus').className='status-msg success';hideModelSelect();}
async function fetchJSONWithCORFallback(url,opts={},timeout=6000){try{const r=await fetch(url,{...opts,signal:AbortSignal.timeout(timeout)});if(r.ok)return await r.json();}catch(e){}const {response}=await fetchWithCORFallback(url,{...opts,headers:{}},timeout);if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}
async function detectModelsFromURL(u,srv){u=u.trim().replace(/\/+$/,'');if(!u)return [];if(srv&&srv.proxy){try{const res=await llmModelsFetch(srv,{signal:AbortSignal.timeout(6000)});if(res.ok){const d=await res.json();if(d.data?.length)return d.data.map(m=>m.id).filter(Boolean);}}catch(e){}return [];}try{const d=await fetchJSONWithCORFallback(`${u}/v1/models`,{headers:serverHeaders(srv)});if(d.data?.length)return d.data.map(m=>m.id).filter(Boolean);}catch(e){}try{const s=await fetchJSONWithCORFallback(`${u}/slots`,{headers:serverHeaders(srv)});if(s[0]?.model)return [s[0].model];}catch(e){}return [];}
async function autoFillModel(){const u=document.getElementById('srvURL').value.trim().replace(/\/+$/,'');if(!u){document.getElementById('modelStatus').textContent='⚠ URL vazia';return;}document.getElementById('btnAutoModel').disabled=true;hideModelSelect();const srv={apiKey:document.getElementById('srvApiKey').value.trim()||undefined,apiKeyType:getSrvApiKeyType()};const models=await detectModelsFromURL(u,srv);if(models.length>1){const sel=document.getElementById('srvModelSelect');sel.innerHTML='<option value="">— '+models.length+' modelos encontrados —</option>'+models.map(m=>`<option value="${m}" ${m===document.getElementById('srvModel').value?'selected':''}>${m}</option>`).join('');sel.style.display='';document.getElementById('modelStatus').textContent=`⚠ ${models.length} modelos`;document.getElementById('modelStatus').className='status-msg';}else if(models.length===1){document.getElementById('srvModel').value=models[0];document.getElementById('modelStatus').textContent=`✓ ${models[0]}`;document.getElementById('modelStatus').className='status-msg success';}else{document.getElementById('modelStatus').textContent='✗ Falhou';document.getElementById('modelStatus').className='status-msg error';}document.getElementById('btnAutoModel').disabled=false;}

function openBatchServerModal(){document.getElementById('batchSrvURLs').value='';openModal('modalBatchServer');}
async function saveBatchServers(){const raw=document.getElementById('batchSrvURLs').value.trim();if(!raw){alert('Informe ao menos uma URL.');return;}const normUrl=u=>(u||'').replace(/\/+$/,'').toLowerCase();const urls=raw.split(/[,\n;]+/).map(s=>s.trim()).filter(Boolean);if(!urls.length){alert('Informe ao menos uma URL.');return;}const btn=document.getElementById('btnSaveBatchServers');btn.disabled=true;let added=0;for(let i=0;i<urls.length;i++){const cleanU=urls[i].replace(/\/+$/,'');if(!cleanU)continue;if(servers.some(s=>normUrl(s.url)===normUrl(cleanU))){continue;}const s={name:`server[${added+1}]`,url:cleanU,maxMsgs:20};try{const d=await fetchJSONWithCORFallback(`${cleanU}/v1/models`,{},4000);if(d.data?.[0]?.id)s.model=d.data[0].id;}catch(e){}servers.push(s);added++;}localStorage.setItem('llama_servers',JSON.stringify(servers));renderServers();closeModal('modalBatchServer');btn.disabled=false;if(added)alert(`✓ ${added} servidor(es) adicionado(s).`);}
function renderConversations(){document.getElementById('convList').innerHTML=conversations.map((c,i)=>`<div class="conv-item ${activeConv===i?'active':''}" onclick="selectConv(${i})"><span>${escapeHtml(c.title)}</span><div class="item-actions"><button title="Renomear" onclick="event.stopPropagation();renameConv(${i})">✏️</button><button title="Editar título e limpar" onclick="event.stopPropagation();editConv(${i})">🛠</button><button onclick="event.stopPropagation();deleteConv(${i})">🗑</button></div></div>`).join('');}
function renameConv(i){let t=prompt('Novo nome da conversa:',conversations[i].title);if(t===null)return;t=t.trim();if(!t)return;conversations[i].title=t;saveConversations();renderConversations();}
function editConv(i){
  const c=conversations[i];
  let t=prompt('Título da conversa:',c.title);
  if(t===null)return;
  const opts=[];
  if(c.messages.length)opts.push(`\nOK = também APAGAR as ${c.messages.length} mensagem(ns)\nCancelar = manter mensagens`);
  if(confirm(`Conversa "${c.title}".${opts.join('')}`))c.messages=[];
  if(t.trim())c.title=t.trim();
  saveConversations();renderConversations();
  if(activeConv===i)renderChat();
}
function newConversation(){conversations.push({title:`Conversa ${conversations.length+1}`,messages:[]});activeConv=conversations.length-1;localStorage.setItem('llama_convs',JSON.stringify(conversations));renderConversations();renderChat();}
function selectConv(i){activeConv=i;renderConversations();renderChat();}
function deleteConv(i){if(!confirm('Remover?'))return;conversations.splice(i,1);if(activeConv===i)activeConv=null;else if(activeConv>i)activeConv--;localStorage.setItem('llama_convs',JSON.stringify(conversations));renderConversations();renderChat();}

function renderChat(){
  const area=document.getElementById('chatArea');
  area.classList.toggle('cli-mode',cliMode);
  if(activeConv===null||!conversations[activeConv]){area.innerHTML=renderHomeFunctions();return;}
  const msgs=conversations[activeConv].messages;
  const parts=[];
  let group=[];
  const flushToolGroup=()=>{
    if(!group.length)return;
    const n=group.length;
    parts.push(`<details class="tool-result tool-group"><summary>🔧 Ferramentas <span class="tool-group-count">${n} ${n===1?'chamada':'chamadas'}</span><span class="tool-result-toggle">▶</span></summary><div class="tool-group-body">${group.join('')}</div></details>`);
    group=[];
  };
  for(const m of msgs){
    if(m.role==='tool-msg'||m.role==='tool')group.push(renderSingleMsg(m));
    else{flushToolGroup();parts.push(renderSingleMsg(m));}
  }
  flushToolGroup();
  area.innerHTML=parts.join('');
  area.scrollTop=area.scrollHeight;
}
function renderSingleMsg(m){
  let c;let isMultimodal=false;
  if(Array.isArray(m.content)){
    isMultimodal=true;
    c=m.content.map(part=>{
      if(part.type==='text')return escapeHtml(part.text||'');
      if(part.type==='image_url')return `<img class="msg-img" src="${escapeHtml(part.image_url&&part.image_url.url||'')}" alt="imagem">`;
      return '';
    }).join('<br>');
  }else c=escapeHtml(m.content);
  let statsHtml='';
  if(m.role==='assistant'&&m.usage){
    statsHtml=`<div class="msg-stats"><span class="ms-in">📥 ${m.usage.prompt_tokens} in</span><span class="ms-out">📤 ${m.usage.completion_tokens} out</span><span class="ms-speed">⚡ ${m.speed} tok/s</span><span class="ms-time">⏱ ${m.time}s</span>${m.model?`<span class="ms-model">🧠 ${escapeHtml(m.model)}</span>`:''}</div>`;
  }
  if(m.role==='tool-msg'&&m.full!==undefined){
    return`<div class="msg tool-msg"><details class="tool-result"><summary>${c} <span class="tool-result-toggle">▶</span></summary><pre class="tool-result-body">${escapeHtml(m.full)}</pre></details></div>`;
  }
  if(m.role==='tool'){
    return`<div class="msg tool"><details class="tool-result"><summary>🔧 Resultado da ferramenta <span class="tool-result-toggle">▶</span></summary><pre class="tool-result-body">${escapeHtml(m.content||'')}</pre></details></div>`;
  }
  if(!isMultimodal&&markdownEnabled&&m.role!=='system-msg'&&m.role!=='task-msg'&&m.role!=='tool-msg'&&m.role!=='tool')c=renderMarkdown(c);
  const meta=m.role==='user'?'👤 Você':m.role==='assistant'?'🤖 Assistente':m.role==='subagent'?`${m.icon||'🤖'} ${escapeHtml(m.name||'Sub-Agente')}`:'';
  let reasoningHtml='';
  if(m.role==='assistant'&&m.reasoning_content){
    reasoningHtml=`<details class="reasoning"><summary>🧠 Raciocínio</summary><div class="reasoning-body">${escapeHtml(m.reasoning_content)}</div></details>`;
  }
  return`<div class="msg ${m.role}">${meta?`<div class="meta">${meta}</div>`:''}${reasoningHtml}${c}${statsHtml}</div>`;
}
function escapeHtml(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function renderMarkdown(t){t=t.replace(/```(\w*)\n([\s\S]*?)```/g,'<pre><code>$2</code></pre>');t=t.replace(/`([^`]+)`/g,'<code>$1</code>');t=t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');t=t.replace(/\*(.+?)\*/g,'<em>$1</em>');return t;}

async function explainFetchError(err,url){
  const msg=err?.message||String(err);
  if(!/Failed to fetch|Load failed|NetworkError|Network request failed/i.test(msg))return msg;
  const cleanU=(url||'').trim().replace(/\/+$/,'');
  const hints=[];
  if(location.protocol==='https:'&&cleanU.startsWith('http://'))hints.push('conteúdo misto: página HTTPS não chama HTTP direto — marque "Usar proxy CORS do servidor (relay)" no servidor; o relay serve em HTTPS e chama o HTTP internamente');
  let direct=false;
  try{const r=await fetch(`${cleanU}/v1/models`,{signal:AbortSignal.timeout(4000)});direct=true;}catch(e){}
  if(direct){hints.push('o servidor respondeu a um teste direto — falha específica na requisição POST (verifique CORS para POST, headers e API key)');}
  else{
    let viaProxy=false;
    try{const {response}=await fetchWithCORFallback(`${cleanU}/v1/models`,{},5000);viaProxy=response.ok;}catch(e){}
    if(viaProxy)hints.push('servidor online, mas bloqueado por CORS — o servidor precisa enviar Access-Control-Allow-Origin (llama.cpp: --api-key/--host ou proxy reverso com CORS)');
    else hints.push('servidor inacessível/offline — verifique IP, porta e firewall');
  }
  return `Failed to fetch — ${hints.join(' · ')}`;
}
async function streamChatCompletion(srv, body, onDelta, signal){
  const res=await llmChatFetch(srv, body, {signal});
  if(!res.ok){
    let txt=await res.text();
    try{
      const j=JSON.parse(txt);
      if(j&&j.sent_body){ console.error('[relay] corpo enviado ao upstream:\n'+j.sent_body); txt='Erro do upstream: '+(j.error&&j.error.message?j.error.message:JSON.stringify(j.error))+'  (corpo enviado no console do navegador)'; }
      else txt=`HTTP ${res.status}: ${txt}`;
    }catch(e){ txt=`HTTP ${res.status}: ${txt}`; }
    throw new Error(txt);
  }
  const ct=res.headers.get('content-type')||'';
  if(!ct.includes('text/event-stream')){
    const data=await res.json();
    const choice=data.choices?.[0];
    if(!choice)throw new Error('Resposta vazia: '+JSON.stringify(data).slice(0,300));
    const msg=choice.message||{};
    if(onDelta)onDelta(msg.content||'',msg.tool_calls||null);
    return{content:msg.content||'',tool_calls:msg.tool_calls||[],usage:data.usage||null,reasoning:msg.reasoning_content||msg.reasoning||'',model:data.model||srv.model||''};
  }
  const reader=res.body.getReader();
  const dec=new TextDecoder();
  let buffer='',content='',usage=null,reasoning='',model=srv.model||'';
  const toolCalls=[];
  while(true){
    const{done,value}=await reader.read();
    if(done)break;
    buffer+=dec.decode(value,{stream:true});
    const lines=buffer.split('\n');
    buffer=lines.pop();
    for(const line of lines){
      const t=line.trim();
      if(!t.startsWith('data:'))continue;
      const payload=t.slice(5).trim();
      if(!payload||payload==='[DONE]')continue;
      let d;
      try{d=JSON.parse(payload);}catch(e){continue;}
      if(d.model&&!model)model=d.model;
      if(d.usage)usage=d.usage;
      const ch=d.choices?.[0];
      if(!ch)continue;
      const delta=ch.delta||{};
      if(delta.reasoning_content)reasoning+=delta.reasoning_content;
      if(delta.reasoning)reasoning+=delta.reasoning;
      if(delta.content){content+=delta.content;if(onDelta)onDelta(delta.content,null);}
      if(delta.tool_calls){
        for(const tc of delta.tool_calls){
          const idx=tc.index??0;
          toolCalls[idx]=toolCalls[idx]||{id:'',name:'',arguments:''};
          if(tc.id)toolCalls[idx].id=tc.id;
          if(tc.function){
            if(tc.function.name)toolCalls[idx].name+=tc.function.name;
            if(tc.function.arguments)toolCalls[idx].arguments+=tc.function.arguments;
          }
        }
      }
    }
  }
  if(buffer.trim()){
    const t=buffer.trim();
    if(t.startsWith('data:')){
      const payload=t.slice(5).trim();
      if(payload&&payload!=='[DONE]'){
        try{const d=JSON.parse(payload);if(d.model&&!model)model=d.model;if(d.usage)usage=d.usage;}catch(e){}
      }
    }
  }
  const finalToolCalls=toolCalls.filter(t=>t&&t.name).map(t=>({id:t.id||`call_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,type:'function',function:{name:t.name,arguments:t.arguments}}));
  return{content,tool_calls:finalToolCalls,usage,reasoning,model};
}

 async function sendMessage(){
   const input=document.getElementById('userInput');const text=input.value.trim();if(!text&&!pendingAttachments.length)return;
  const cmd=parseSubAgentCommand(text);
  if(cmd){if(activeConv===null)newConversation();conversations[activeConv].messages.push({role:'user',content:text});input.value='';renderChat();saveConversations();const task=addTask(cmd.task.substring(0,80),cmd.subAgent.name);addTaskMsg(`🚀 "${cmd.subAgent.name}" iniciado.`);executeSubAgentTask(cmd.subAgent,cmd.task,task.id);return;}
  if(activeOrch!==null&&orchestrators[activeOrch]){
    if(activeConv===null)newConversation();conversations[activeConv].messages.push({role:'user',content:text});input.value='';renderChat();saveConversations();
    executeOrchestrator(orchestrators[activeOrch],text);return;
  }
  if(activeServer===null){alert('Selecione um servidor.');return;}
   if(activeConv===null)newConversation();
   const conv=conversations[activeConv];
   let userContent=text;
   if(pendingAttachments.length){
     const parts=[{type:'text',text:text}];
     for(const a of pendingAttachments)parts.push({type:'image_url',image_url:{url:a.data}});
     userContent=parts;
   }
   conv.messages.push({role:'user',content:userContent});input.value='';pendingAttachments=[];renderAttachPreview();renderChat();saveConversations();
  const btnSend=document.getElementById('btnSend');const btnStop=document.getElementById('btnStop');
  btnSend.disabled=true;btnStop.disabled=false;abortController=new AbortController();startSpeedTracking();
  const assistantMsg={role:'assistant',content:'',tool_calls:null,reasoning_content:'',speed:'0',tokens:0,time:'0.0',usage:{prompt_tokens:0,completion_tokens:0}};
  conv.messages.push(assistantMsg);
  let streamedChars=0;let srv=null;
  try{
    const mcpTools=getActiveMCPTools();
    const toolsForAPI=mcpTools.map(({_mcpIndex,...t})=>t);
    const fb=(servers[activeServer]?.fallbacks||[]).filter(f=>servers[f]&&f!==activeServer);
    const seen=new Set();seen.add(activeServer);
    const srvList=[];
    for(const i of [activeServer,...fb]){if(seen.has(i))continue;seen.add(i);srvList.push(servers[i]);}
    if(!srvList.length)srvList.push(servers[activeServer]);
    srv=srvList[0];
    let lastError=null;
    for(let si=0;si<srvList.length;si++){
      srv=srvList[si];
      assistantMsg.content='';
      assistantMsg.tool_calls=null;
      streamedChars=0;
      if(si>0)addSystemMsg(`🔄 Servidor "${srv.name}" (reserva).`);
      try{
        let iteration=0;const maxIter=10;
        let totalPromptTokens=0,totalCompletionTokens=0,totalTime=0;
        let estIn=0,estOut=0;
        while(iteration<maxIter){
          iteration++;
          const messages=[];const sysPrompt=getActiveSystemPrompt();if(sysPrompt)messages.push({role:'system',content:sysPrompt});
          const maxMsgs=getActiveMaxMsgs();
          const hist=conv.messages.filter(m=>(m.role==='user'||m.role==='assistant'||m.role==='tool')&&!(m===assistantMsg&&!(m.tool_calls&&m.tool_calls.length)));
          let recent=hist.slice(-maxMsgs);
          if(!recent.some(m=>m.role==='user')){
            const lastUser=[...hist].reverse().find(m=>m.role==='user');
            if(lastUser)recent=[lastUser,...recent];
          }
          let pendingToolIds=new Set();
          recent.forEach(m=>{
            if(m.role==='tool'){
              if(m.tool_call_id&&pendingToolIds.has(m.tool_call_id))messages.push({role:'tool',tool_call_id:m.tool_call_id,content:m.content});
              return;
            }
            pendingToolIds=new Set();
            if(m.role==='assistant'){
              const am={role:'assistant',content:m.content||''};
              if(m.tool_calls&&m.tool_calls.length){
                am.tool_calls=m.tool_calls;
                pendingToolIds=new Set(m.tool_calls.map(t=>t.id));
              }
              if(m.reasoning_content)am.reasoning_content=m.reasoning_content;
              messages.push(am);
            }
            else messages.push({role:m.role,content:m.content});
          });
          const body={messages,stream:true};body.stream_options={include_usage:true};if(srv.model)body.model=srv.model;const mt=getActiveMaxTokens();if(mt)body.max_tokens=mt;const tp=getActiveTemperature();if(tp!==undefined)body.temperature=tp;const tpP=getActiveTopP();if(tpP!==undefined)body.top_p=tpP;
if(toolsForAPI.length>0){body.tools=sanitizeToolsForOllama(toolsForAPI);body.tool_choice='auto';}
          applyOllamaCompat(srv,body);
          const histMessages=stripOllamaMessages(srv,messages);
          if(histMessages!==messages)body.messages=histMessages;
          assistantMsg.content='';
          const reqStart=performance.now();
          const result=await streamChatCompletion(srv,body,(delta)=>{
            assistantMsg.content+=delta;
            streamedChars+=delta.length;
            incrementTokens(Math.max(1,Math.round(delta.length/4)));
            if(streamedChars%32<delta.length)renderChat();
          },abortController.signal);
          assistantMsg.reasoning_content=result.reasoning||assistantMsg.reasoning_content||'';
          if(result.model)assistantMsg.model=result.model;
          const reqTime=(performance.now()-reqStart)/1000;totalTime+=reqTime;
          totalPromptTokens+=result.usage?.prompt_tokens||0;
          totalCompletionTokens+=result.usage?.completion_tokens||0;
          estIn=Math.ceil(messages.reduce((a,m)=>a+(m.content||'').length,0)/4)||estIn;
          estOut=Math.ceil((assistantMsg.content||'').length/4);
          if(result.tool_calls&&result.tool_calls.length>0){
            assistantMsg.tool_calls=result.tool_calls;
            for(const tc of result.tool_calls){
              const fn=tc.function.name;let args={};try{args=JSON.parse(tc.function.arguments||'{}');}catch(e){}
              addToolMsg(`🔧 ${fn}(${JSON.stringify(args).substring(0,120)})`);
              const toolEntry=mcpTools.find(t=>t.function.name===fn);
              let toolResult='';
              if(toolEntry){try{toolResult=await executeMCPToolByIndex(toolEntry._mcpIndex,fn,args);}catch(err){toolResult=`Erro: ${err.message}`;}}
              else toolResult='Erro: Ferramenta não encontrada.';
              conv.messages.push({role:'tool',tool_call_id:tc.id,content:toolResult});
              addToolResultMsg(fn,toolResult);
            }
            saveConversations();renderChat();continue;
          }
          if(!result.content)throw new Error('Resposta vazia');
          break;
        }
        const{elapsed,tps}=stopSpeedTracking(totalCompletionTokens||streamedChars);
        assistantMsg.speed=tps;
        if(!totalPromptTokens&&estIn)totalPromptTokens=estIn;
        if(!totalCompletionTokens&&estOut)totalCompletionTokens=estOut;
        assistantMsg.tokens=totalCompletionTokens;
        assistantMsg.time=totalTime.toFixed(1);
        assistantMsg.usage={prompt_tokens:totalPromptTokens,completion_tokens:totalCompletionTokens};
        delete assistantMsg.tool_calls;
        addStats(totalPromptTokens,totalCompletionTokens,totalTime);
        saveConversations();renderChat();
        lastError=null;break;
      }catch(err){
        stopSpeedTracking(tokenCount);
        if(err.name==='AbortError'){
          if(assistantMsg.content.trim()){assistantMsg.tokens=streamedChars;delete assistantMsg.tool_calls;saveConversations();addSystemMsg('⏹ Interrompido.');}
          else conv.messages=conv.messages.filter(m=>m!==assistantMsg);
          lastError=null;break;
        }
        lastError=err;
        if(si<srvList.length-1){conv.messages=conv.messages.filter(m=>m!==assistantMsg);conv.messages.push(assistantMsg);continue;}
        throw err;
      }
    }
    if(lastError){throw lastError;}
  }catch(err){
    stopSpeedTracking(tokenCount);
    if(err.name==='AbortError'){
      if(assistantMsg.content.trim()){assistantMsg.tokens=streamedChars;delete assistantMsg.tool_calls;saveConversations();addSystemMsg('⏹ Interrompido.');}
      else conv.messages=conv.messages.filter(m=>m!==assistantMsg);
    }else{conv.messages=conv.messages.filter(m=>m!==assistantMsg);addSystemMsg(`❌ ${await explainFetchError(err,srv.url)}`);}
  }
  finally{btnSend.disabled=false;btnStop.disabled=true;abortController=null;renderChat();}
}

function addToolMsg(text){if(activeConv!==null&&conversations[activeConv]){conversations[activeConv].messages.push({role:'tool-msg',content:text});renderChat();}}
function addToolResultMsg(fn,result){
  if(activeConv!==null&&conversations[activeConv]){
    const short=(result||'').replace(/\s+/g,' ').trim();
    const summary=`📋 ${fn}: ${short.substring(0,60)}${short.length>60?'...':''}`;
    conversations[activeConv].messages.push({role:'tool-msg',content:summary,full:result||''});
    renderChat();
  }
}
function stopGeneration(){if(abortController)abortController.abort();}
function addSystemMsg(text){if(activeConv!==null&&conversations[activeConv]){conversations[activeConv].messages.push({role:'system-msg',content:text});renderChat();}}
function saveConversations(){localStorage.setItem('llama_convs',JSON.stringify(conversations));}
function handleKey(e){
  if(mentionState.active){
    if(e.key==='ArrowDown'){e.preventDefault();moveMention(1);return;}
    if(e.key==='ArrowUp'){e.preventDefault();moveMention(-1);return;}
    if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();pickMention(mentionState.sel);return;}
    if(e.key==='Escape'){e.preventDefault();hideMentionPopup();return;}
  }
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}
}
let mentionState={active:false,start:-1,items:[],sel:0,kind:'ws'};
function hideMentionPopup(){mentionState={active:false,start:-1,items:[],sel:0,kind:'ws'};document.getElementById('mentionPopup').style.display='none';}
function getMentionQuery(text,caret){const before=text.substring(0,caret);const wm=before.match(/(?:^|\s)@@([^\s]*)$/);if(wm)return{kind:'we',query:wm[1],start:caret-wm[1].length-2};const m=before.match(/(?:^|\s)@([^\s@]*)$/);if(!m)return null;return{kind:'ws',query:m[1],start:caret-m[1].length-1};}
function getSlashQuery(text,caret){
  const before=text.substring(0,caret);
  const o=before.match(/(?:^|\s)\\\\([^\s\\]*)$/);
  if(o)return{kind:'orch',query:o[1],start:caret-o[1].length-2};
  const a=before.match(/(?:^|\s)\\([^\s\\]*)$/);
  if(a)return{kind:'agent',query:a[1],start:caret-a[1].length-1};
  const s=before.match(/(?:^|\s)\/\/([^\s/]*)$/);
  if(s)return{kind:'skill',query:s[1],start:caret-s[1].length-2};
  const m=before.match(/(?:^|\s)\/([^\s/]*)$/);
  if(m)return{kind:'sub',query:m[1],start:caret-m[1].length-1};
  return null;
}
function wsMentionItems(query){
  const files=wsGetFiles();
  const dirs=new Set();
  for(const p of Object.keys(files)){const parts=p.split('/');for(let i=1;i<parts.length;i++)dirs.add(parts.slice(0,i).join('/'));}
  const lastSlash=query.lastIndexOf('/');
  const basePath=lastSlash>=0?query.substring(0,lastSlash):'';
  const filter=(lastSlash>=0?query.substring(lastSlash+1):query).toLowerCase();
  const prefix=basePath?basePath+'/':'';
  const items=[];
  if(basePath){
    const pi=basePath.lastIndexOf('/');
    const parent=pi>0?basePath.substring(0,pi):'';
    items.push({path:parent?parent+'/':'',dir:true,name:'..',icon:'📂',isParent:true});
  }
  for(const d of [...dirs].sort()){
    if(basePath){if(!d.startsWith(prefix)||d===basePath||d.substring(prefix.length).includes('/'))continue;}
    else{if(d.includes('/'))continue;}
    const name=d.substring(prefix.length);
    if(!filter||name.toLowerCase().includes(filter))items.push({path:d+'/',dir:true,name:name+'/',icon:'📂'});
  }
  for(const p of Object.keys(files).sort()){
    if(basePath){if(!p.startsWith(prefix)||p.substring(prefix.length).includes('/'))continue;}
    else{if(p.includes('/'))continue;}
    const name=p.substring(prefix.length);
    if(!filter||name.toLowerCase().includes(filter))items.push({path:p,dir:false,name:name,icon:'📄'});
  }
  return items.slice(0,30);
}
async function weMentionItems(query){
  const lastSlash=query.lastIndexOf('/');
  const basePath=lastSlash>=0?query.substring(0,lastSlash):'';
  const filter=(lastSlash>=0?query.substring(lastSlash+1):query).toLowerCase();
  const items=[];
  if(basePath){
    const pi=basePath.lastIndexOf('/');
    const parent=pi>0?basePath.substring(0,pi):'';
    items.push({path:parent?parent+'/':'',dir:true,name:'..',icon:'📂',isParent:true});
  }
  let data;
  try{data=await weCall('list',{path:basePath});}catch(e){return items;}
  const entries=Array.isArray(data?.entries)?data.entries:[];
  const dirs=entries.filter(e=>e.type==='dir').sort((a,b)=>a.name.localeCompare(b.name));
  const files=entries.filter(e=>e.type!=='dir').sort((a,b)=>a.name.localeCompare(b.name));
  for(const d of dirs){
    if(!filter||d.name.toLowerCase().includes(filter))items.push({path:d.path+'/',dir:true,name:d.name+'/',icon:'📂'});
  }
  for(const f of files){
    if(!filter||f.name.toLowerCase().includes(filter))items.push({path:f.path,dir:false,name:f.name,icon:'📄'});
  }
  return items.slice(0,30);
}
async function updateMentionPopup(){
  const ta=document.getElementById('userInput');
  const caret=ta.selectionStart??ta.value.length;
  const m=getMentionQuery(ta.value,caret)||getSlashQuery(ta.value,caret);
  if(!m){hideMentionPopup();return;}
  let items=[],header='';
  if(m.kind==='ws'){
    items=wsMentionItems(m.query);
    header='📁 Workspace (local) — ↑↓ navegar · Enter selecionar · Esc fechar';
  }else if(m.kind==='we'){
    items=await weMentionItems(m.query);
    header='📝 Weditor (servidor) — ↑↓ navegar · Enter selecionar · Esc fechar';
  }else if(m.kind==='sub'){
    const q=m.query.toLowerCase();
    items=subAgents.map((s,i)=>({name:s.name,icon:s.icon||'🤖',desc:s.desc||'',idx:i})).filter(x=>x.name.toLowerCase().includes(q)).slice(0,20);
    header='🤖 Sub-Agentes — ↑↓ navegar · Enter selecionar · Esc fechar';
  }else if(m.kind==='skill'){
    const q=m.query.toLowerCase();
    items=skills.map((s,i)=>({name:s.name,icon:s.icon||'⚡',desc:(s.prompt||'').substring(0,40),idx:i})).filter(x=>x.name.toLowerCase().includes(q)).slice(0,20);
    header='⚡ Skills — ↑↓ navegar · Enter selecionar · Esc fechar';
  }else if(m.kind==='agent'){
    const q=m.query.toLowerCase();
    items=agents.map((s,i)=>({name:s.name,icon:s.icon||'🧠',desc:s.desc||'',idx:i})).filter(x=>x.name.toLowerCase().includes(q)).slice(0,20);
    header='🧠 Agentes — ↑↓ navegar · Enter selecionar · Esc fechar';
  }else{
    const q=m.query.toLowerCase();
    items=orchestrators.map((s,i)=>({name:s.name,icon:s.icon||'🎼',desc:s.desc||'',idx:i})).filter(x=>x.name.toLowerCase().includes(q)).slice(0,20);
    header='🎼 Orquestradores — ↑↓ navegar · Enter selecionar · Esc fechar';
  }
  if(!items.length){hideMentionPopup();return;}
  mentionState={active:true,start:m.start,items,sel:0,kind:m.kind};
  document.getElementById('mentionPopup').innerHTML=`<div class="mention-header">${header}</div>`+items.map((it,i)=>`<div class="mention-item${i===0?' sel':''}" data-i="${i}" onmousedown="event.preventDefault();pickMention(${i})">${it.icon} ${escapeHtml(it.name)}${it.desc?` <span class="mention-desc">— ${escapeHtml(it.desc)}</span>`:''}</div>`).join('');
  document.getElementById('mentionPopup').style.display='block';
}
function moveMention(delta){
  const pop=document.getElementById('mentionPopup');
  mentionState.sel=Math.max(0,Math.min(mentionState.items.length-1,mentionState.sel+delta));
  pop.querySelectorAll('.mention-item').forEach(el=>{
    const i=parseInt(el.dataset.i);
    el.classList.toggle('sel',i===mentionState.sel);
    if(i===mentionState.sel)el.scrollIntoView({block:'nearest'});
  });
}
function pickMention(i){
  const ta=document.getElementById('userInput');
  const it=mentionState.items[i];if(!it)return;
  const caret=ta.selectionStart??ta.value.length;
  if(mentionState.kind==='ws'){
    if(it.dir){
      ta.value=ta.value.substring(0,mentionState.start)+'@'+it.path+ta.value.substring(caret);
      ta.selectionStart=ta.selectionEnd=mentionState.start+1+it.path.length;
      updateMentionPopup();
      return;
    }
    const insert='@'+it.path+' ';
    ta.value=ta.value.substring(0,mentionState.start)+insert+ta.value.substring(caret);
    ta.selectionStart=ta.selectionEnd=mentionState.start+insert.length;
  }else if(mentionState.kind==='we'){
    if(it.dir){
      ta.value=ta.value.substring(0,mentionState.start)+'@@'+it.path+ta.value.substring(caret);
      ta.selectionStart=ta.selectionEnd=mentionState.start+2+it.path.length;
      updateMentionPopup();
      return;
    }
    const insert='@@'+it.path+' ';
    ta.value=ta.value.substring(0,mentionState.start)+insert+ta.value.substring(caret);
    ta.selectionStart=ta.selectionEnd=mentionState.start+insert.length;
  }else if(mentionState.kind==='sub'){
    const insert='/'+it.name+' ';
    ta.value=ta.value.substring(0,mentionState.start)+insert+ta.value.substring(caret);
    ta.selectionStart=ta.selectionEnd=mentionState.start+insert.length;
  }else if(mentionState.kind==='skill'){
    ta.value=ta.value.substring(0,mentionState.start)+ta.value.substring(caret);
    applySkill(it.idx);
  }else if(mentionState.kind==='agent'){
    ta.value=ta.value.substring(0,mentionState.start)+ta.value.substring(caret);
    applyAgent(it.idx);
  }else{
    ta.value=ta.value.substring(0,mentionState.start)+ta.value.substring(caret);
    applyOrch(it.idx);
  }
  hideMentionPopup();ta.focus();
}
function toggleMarkdown(){markdownEnabled=!markdownEnabled;localStorage.setItem('llama_markdown',JSON.stringify(markdownEnabled));document.getElementById('btnMarkdown').style.background=markdownEnabled?'var(--accent2)':'';renderChat();}
function toggleCLI(){cliMode=!cliMode;localStorage.setItem('llama_cli_mode',JSON.stringify(cliMode));document.getElementById('btnCLI').style.background=cliMode?'var(--accent2)':'';renderChat();}
document.addEventListener('DOMContentLoaded',()=>{const bm=document.getElementById('btnMarkdown');if(bm)bm.style.background=markdownEnabled?'var(--accent2)':'';const bc=document.getElementById('btnCLI');if(bc)bc.style.background=cliMode?'var(--accent2)':'';});
let fontScale=parseFloat(localStorage.getItem('llama_font_scale'))||1;
function applyFontScale(){fontScale=Math.max(0.7,Math.min(1.8,fontScale));document.documentElement.style.setProperty('--font-scale',fontScale);localStorage.setItem('llama_font_scale',String(fontScale));}
function changeFontScale(delta){fontScale=Math.round((fontScale+delta)*10)/10;applyFontScale();}
applyFontScale();

function exportAll(){const d=JSON.stringify({servers,conversations,skills,agents,subAgents,mcps,orchestrators},null,2);const b=new Blob([d],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='llama-chat-backup.json';a.click();}
async function importAll(event){const file=event.target.files[0];if(!file)return;const st=document.getElementById('importStatus');const reader=new FileReader();reader.onload=async(e)=>{try{const data=JSON.parse(e.target.result);if(data.servers){servers=data.servers;st.className='import-status working';for(let i=0;i<servers.length;i++){if(!servers[i].model){const d=await detectModelFromURL(servers[i].url,servers[i]);if(d)servers[i].model=d;}st.textContent=`🔍 (${i+1}/${servers.length})...`;renderServers();}localStorage.setItem('llama_servers',JSON.stringify(servers));st.className='import-status done';st.textContent=`✓ ${servers.length} importados.`;setTimeout(()=>{st.textContent='';st.className='import-status';},5000);}if(data.conversations){conversations=data.conversations;localStorage.setItem('llama_convs',JSON.stringify(conversations));}if(data.skills){skills=data.skills;localStorage.setItem('llama_skills',JSON.stringify(skills));}if(data.agents){agents=data.agents;localStorage.setItem('llama_agents',JSON.stringify(agents));}if(data.subAgents){subAgents=data.subAgents;localStorage.setItem('llama_subagents',JSON.stringify(subAgents));}if(data.mcps){mcps=data.mcps;localStorage.setItem('llama_mcps',JSON.stringify(mcps));}if(data.orchestrators){orchestrators=data.orchestrators;localStorage.setItem('llama_orchestrators',JSON.stringify(orchestrators));}renderServers();renderConversations();renderSkills();renderAgents();renderSubAgents();renderMCPs();renderOrchestrators();checkAllMCPStatus();refreshMicroMCPTools();}catch{st.textContent='✗ Inválido.';setTimeout(()=>st.textContent='',4000);}};reader.readAsText(file);event.target.value='';}

let pendingAttachments=[];
function handleAttach(event){
  const f=event.target.files[0];event.target.value='';if(!f)return;
  if(f.type.startsWith('image/')){
    const r=new FileReader();
    r.onload=(e)=>{pendingAttachments.push({name:f.name,mime:f.type,data:e.target.result});renderAttachPreview();};
    r.readAsDataURL(f);
  }else{
    const r=new FileReader();
    r.onload=(e)=>{document.getElementById('userInput').value+=`\n[Arquivo: ${f.name}]\n${e.target.result.substring(0,2000)}`;};
    r.readAsText(f);
  }
}
function renderAttachPreview(){
  const box=document.getElementById('attachPreview');if(!box)return;
  box.innerHTML=pendingAttachments.map((a,i)=>`<div class="att-chip" title="${escapeHtml(a.name)}"><img src="${a.data}" alt=""><span>${escapeHtml(a.name)}</span><button type="button" onclick="removeAttachment(${i})">✕</button></div>`).join('');
}
function removeAttachment(i){pendingAttachments.splice(i,1);renderAttachPreview();}

function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(el=>{el.addEventListener('click',(e)=>{if(e.target===el){if(el.id==='modalServer'){editingServerIndex=null;clearServerForm();}if(el.id==='modalSkill'){editingSkillIndex=null;clearSkillForm();}if(el.id==='modalAgent'){editingAgentIndex=null;clearAgentForm();}if(el.id==='modalSubAgent'){editingSubAgentIndex=null;clearSubAgentForm();}if(el.id==='modalMCP'){editingMCPIndex=null;clearMCPForm();}if(el.id==='modalOrch'){editingOrchIndex=null;clearOrchForm();}el.classList.remove('open');}});});
