const templates = {
    chat: {
        tipo: "SDD - Sistema de Chat com IA",
        contexto: "Assistente conversacional que mantem contexto e fornece respostas seguras.",
        objetivo: "Processar entradas, identificar intencoes e gerar respostas em texto natural.",
        regras_padrao: [
            "Manter historico de conversas para contexto.",
            "Recusar educadamente solicitacoes inseguras.",
            "Latencia maxima de resposta: 2 segundos."
        ],
        formato_saida: "JSON contendo { 'response': string, 'confidence_score': float }"
    },
    review: {
        tipo: "SDD - Agente de Revisao de Codigo (Code Review)",
        contexto: "Revisor automatizado de Pull Requests, analisando diffs em busca de bugs e mas praticas.",
        objetivo: "Analisar trechos de codigo e retornar feedback acionavel classificado por severidade.",
        regras_padrao: [
            "Nunca reescreva o arquivo inteiro, aponte linhas especificas.",
            "Classifique problemas como: CRITICO, AVISO ou SUGESTAO.",
            "Sugira correcoes usando blocos de codigo diff."
        ],
        formato_saida: "Markdown estruturado com: Resumo, Problemas Encontrados e Sugestao de Correcao."
    }
};

document.getElementById('generateBtn').addEventListener('click', generateSDD);
document.getElementById('copyBtn').addEventListener('click', copyToClipboard);

function generateSDD() {
    const type = document.getElementById('templateType').value;
    const projectName = document.getElementById('projectName').value || "Projeto Sem Nome";
    const customRulesRaw = document.getElementById('customRules').value;
    
    const template = templates[type];
    const customRules = customRulesRaw.split('\n').filter(rule => rule.trim() !== "");
    const allRules = [...template.regras_padrao, ...customRules];

    const sddDocument = `# Documento de Design de Software (SDD) para IA
## 1. Metadados
- **Projeto:** ${projectName}
- **Tipo de Sistema:** ${template.tipo}
- **Data de Geracao:** ${new Date().toLocaleDateString('pt-BR')}

## 2. Contexto e Objetivo
- **Contexto:** ${template.contexto}
- **Objetivo Principal:** ${template.objetivo}

## 3. Regras de Negocio e Restricoes (Constraints)
${allRules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

## 4. Especificacao de Interfaces
- **Formato de Saida Exigido da IA:** ${template.formato_saida}

## 5. Instrucoes Diretas para o Modelo de Linguagem (System Prompt)
"Voce e um especialista em ${type === 'chat' ? 'Engenharia de Chatbots e UX Conversacional' : 'Engenharia de Software e Seguranca de Codigo'}. 
Sua tarefa e operar estritamente dentro das regras de negocio listadas acima. 
Ao gerar uma resposta, valide se ela atende ao 'Formato de Saida Exigido'. Nao invente funcionalidades fora deste escopo."
`;

    document.getElementById('outputCode').textContent = sddDocument;
}

function copyToClipboard() {
    const code = document.getElementById('outputCode').textContent;
    if (code.includes('Selecione as opcoes')) return;
    
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.textContent;
        btn.textContent = "Copiado!";
        setTimeout(() => btn.textContent = originalText, 2000);
    });
}
