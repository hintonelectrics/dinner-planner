/* Optional AI helper. Talks straight from the phone to the Anthropic API using the person's own API key.
   The key is saved on that phone only (never synced, never in the repository). */
(function () {
  var cfg = window.DP_CONFIG || {};
  var URL = cfg.aiUrl || 'https://api.anthropic.com/v1/messages';
  var MODELS = [
    ['claude-haiku-4-5-20251001', 'Haiku 4.5 (fast, cheapest)'],
    ['claude-sonnet-5', 'Sonnet 5 (more careful, costs more)']
  ];
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { }
    return null;
  }
  function key() { return ls('dp_ai_key') || ''; }
  function model() { var m = ls('dp_ai_model'); return MODELS.some(function (x) { return x[0] === m; }) ? m : MODELS[0][0]; }

  function call(content, system, maxTokens) {
    return fetch(URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: model(), max_tokens: maxTokens || 2500, system: system, messages: [{ role: 'user', content: content }] })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error((j.error && j.error.message) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
        return (j.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
      });
    });
  }
  function friendly(e) {
    if (e && (e.status === 401 || e.status === 403)) return 'Your API key was rejected. Check it in Settings.';
    if (e && e.status === 429) return 'Too many requests right now. Try again in a minute.';
    if (e && e.status >= 500) return 'Claude is busy at the moment. Try again shortly.';
    if (e && e.status === 400 && /credit|balance/i.test(e.message || '')) return 'Your API account is out of credit. Top it up at console.anthropic.com.';
    if (e instanceof TypeError) return 'Could not reach Claude. Check your signal and try again.';
    return (e && e.message) || 'Something went wrong. Try again.';
  }
  function parseJson(t) {
    var a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('Claude did not send back a recipe. Try again.');
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { throw new Error('Could not read the reply. Try again.'); }
  }
  function num(x, d) { var n = parseFloat(x); return isFinite(n) ? n : d; }

  function recipeSystem(aisles, cuisines) {
    return 'You convert recipes into JSON for a UK home-cooking app. Reply with ONLY one JSON object and nothing else.\n' +
      'Schema: {"name": string, "cuisine": string, "type": "Dinner"|"Side"|"Dessert", "time": integer minutes in total, "difficulty": "Easy"|"Medium"|"Hard", "serves": integer, ' +
      '"macros": {"cal": number, "protein": number, "carbs": number, "fat": number} per serving (estimate if the recipe does not give them), ' +
      '"ingredients": [{"name": string, "qty": number (0 if none), "unit": string, "aisle": string}], "steps": [string]}\n' +
      'Rules: use metric units (g, kg, ml, l, tsp, tbsp) and use an empty string for whole items like eggs or onions. Ingredient names are short with no quantity in them, for example "Chicken thighs". ' +
      'aisle must be exactly one of: ' + aisles.join(', ') + '. cuisine should be exactly one of: ' + cuisines.join(', ') + ' if any fits, otherwise a short new category name. ' +
      'type is "Dinner" unless it is clearly a dessert or a side. Steps are short, in order, with no numbering. serves is the number of servings the original recipe makes. ' +
      'If the input is not a recipe, reply {"error":"not a recipe"}.';
  }
  function clean(r, aisles) {
    if (!r || r.error) throw new Error('That does not look like a recipe.');
    var m = r.macros || {};
    return {
      name: String(r.name || '').trim(),
      cuisine: String(r.cuisine || 'Other').trim() || 'Other',
      type: ['Dinner', 'Side', 'Dessert'].indexOf(r.type) >= 0 ? r.type : 'Dinner',
      time: Math.round(num(r.time, 30)) || 30,
      difficulty: ['Easy', 'Medium', 'Hard'].indexOf(r.difficulty) >= 0 ? r.difficulty : 'Easy',
      serves: Math.max(1, Math.round(num(r.serves, 2))),
      macros: { cal: Math.round(num(m.cal, '')) || '', protein: Math.round(num(m.protein, '')) || '', carbs: Math.round(num(m.carbs, '')) || '', fat: Math.round(num(m.fat, '')) || '' },
      ingredients: (r.ingredients || []).map(function (g) {
        return { name: String(g.name || '').trim(), qty: num(g.qty, 0), unit: String(g.unit || '').trim(), aisle: aisles.indexOf(g.aisle) >= 0 ? g.aisle : 'Other' };
      }).filter(function (g) { return g.name; }),
      steps: (r.steps || []).map(function (s) { return String(s).trim(); }).filter(Boolean)
    };
  }

  function fromText(text, aisles, cuisines) {
    return call(text.slice(0, 20000), recipeSystem(aisles, cuisines), 3000).then(function (t) { return clean(parseJson(t), aisles); });
  }
  function fromImage(dataUrl, aisles, cuisines) {
    var b64 = dataUrl.split(',')[1];
    var content = [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: 'Convert the recipe in this photo.' }];
    return call(content, recipeSystem(aisles, cuisines), 3000).then(function (t) { return clean(parseJson(t), aisles); });
  }
  function macros(name, serves, ings) {
    var lines = ings.map(function (g) { return '- ' + [g.qty || '', g.unit || '', g.name].join(' ').replace(/\s+/g, ' ').trim(); }).join('\n');
    var sys = 'You estimate nutrition. Reply with ONLY a JSON object {"cal": number, "protein": number, "carbs": number, "fat": number} giving whole-number estimates PER SERVING (kcal and grams).';
    return call('Recipe: ' + (name || 'Untitled') + '\nServes: ' + serves + '\nIngredients:\n' + lines, sys, 300).then(function (t) {
      var r = parseJson(t);
      return { cal: Math.round(num(r.cal, 0)) || '', protein: Math.round(num(r.protein, 0)) || '', carbs: Math.round(num(r.carbs, 0)) || '', fat: Math.round(num(r.fat, 0)) || '' };
    });
  }
  function test() { return call('Reply with the single word: ok', 'You are a connection test.', 10); }

  window.DPAI = {
    models: MODELS, key: key, model: model,
    hasKey: function () { return key().length > 10; },
    setKey: function (k) { ls('dp_ai_key', k ? k : null); },
    setModel: function (m) { ls('dp_ai_model', m); },
    friendly: friendly, fromText: fromText, fromImage: fromImage, macros: macros, test: test
  };
})();
