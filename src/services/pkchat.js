import Groq from 'groq-sdk';

const groq = new Groq({ 
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true 
});

export async function conversarComPKChat(mensagem, historico = []) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Você é o PKChat, assistente virtual do PKSISTEM.
          
REGRAS IMPORTANTES:
1. Você ajuda donos de negócios a gerenciar seu cardápio digital
2. Seja amigável e direto
3. Se o usuário pedir para adicionar/editar produtos, confirme antes: "Posso adicionar [produto] por R$[valor]. Posso prosseguir?"
4. Se o usuário pedir algo que você não pode fazer, diga: "Vou precisar que você faça isso manualmente no painel"
5. Nunca invente informações sobre o sistema

O que você PODE fazer:
- Tirar dúvidas sobre como usar o PKSISTEM
- Explicar funcionalidades (cardápio, pedidos, clientes, etc)
- Ajudar com configurações do site
- Orientar sobre planos e recursos

O que você NÃO pode fazer (ainda):
- Acessar o banco de dados diretamente
- Modificar produtos/pedidos automaticamente
- Ver dados de outros usuários

Responda sempre em português do Brasil.`
        },
        ...historico,
        { role: "user", content: mensagem }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 500
    });

    return chatCompletion.choices[0]?.message?.content || "Desculpe, não entendi. Pode reformular?";
  } catch (error) {
    console.error("Erro no PKChat:", error);
    return "Ops! Tive um problema aqui. Tenta de novo em alguns segundos.";
  }
}