// Minimal AI adapter with fallback schema
// Exposes window.AI.getSuggestions({ context: 'group'|'child', state })

(function(){
  function normalizeOption(o){
    if (!o) return null;
    return {
      label: String(o.label || '').slice(0, 40) || '选项',
      ruleId: o.ruleId || '',
      topic: o.topic,
      tone: o.tone,
      deltas: o.deltas || {},
      childReplyAccept: o.childReplyAccept,
      childReplyReject: o.childReplyReject
    };
  }

  async function callAI(payload){
    const cfg = window.AI_CONFIG;
    if (!cfg || !cfg.baseUrl || !cfg.apiKey) return null;
    try {
      const res = await fetch(cfg.baseUrl.replace(/\/$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + cfg.apiKey
        },
        body: JSON.stringify({
          model: cfg.model || 'gpt-4o-mini',
          temperature: 0.7,
          messages: [
            { role: 'system', content: '你是校园聊天模拟器的建议生成器。只输出JSON，不要自由聊天。生成不超过3个选项，每个包含label、ruleId/topic或tone、deltas({mood,study,energy,affinity} -5..+5)、childReplyAccept/Reject。' },
            { role: 'user', content: JSON.stringify(payload) }
          ]
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!text) return null;
      let json = null;
      try { json = JSON.parse(text); } catch(_) {}
      if (!Array.isArray(json)) return null;
      return json.map(normalizeOption).filter(Boolean).slice(0,3);
    } catch(e) {
      return null;
    }
  }

  window.AI = window.AI || {};
  window.AI.getSuggestions = async function(params){
    const { context, state } = params || {};
    const payload = {
      context,
      // 仅传必要状态避免泄漏
      stats: state && state.stats,
      balances: {
        parent: state && state.parentFund,
        campus: state && state.campusCard,
        phone: state && state.phoneCard
      }
    };
    const ai = await callAI(payload);
    return ai || [];
  };
})();


