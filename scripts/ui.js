(function(window, $){
  'use strict';
  window.App = window.App || {};

  const U = window.App.Util;
  const Store = window.App.AppStorage;

  // Application state and rendering logic
  const initialState = () => ({
    recipes: [],
    planner: U.days.reduce((acc,d)=>{ acc[d] = []; return acc; }, {}),
    grocery: [],
    filters: { search: '', tags: [], favoritesOnly: false }
  });

  window.App.state = initialState();

  function persist(){
    Store.save('recipes', window.App.state.recipes);
    Store.save('planner', window.App.state.planner);
    Store.save('grocery', window.App.state.grocery);
    Store.save('filters', window.App.state.filters);
  }

  function load(){
    const recipes = Store.load('recipes', null);
    window.App.state.recipes = recipes && Array.isArray(recipes) && recipes.length ? recipes : U.demoRecipes();
    window.App.state.planner = Store.load('planner', initialState().planner) || initialState().planner;
    window.App.state.grocery = Store.load('grocery', []);
    window.App.state.filters = Store.load('filters', initialState().filters) || initialState().filters;
    persist();
  }

  function tagSet(recipes){
    const set = new Set();
    recipes.forEach(r => (r.tags||[]).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }

  function filterRecipes(){
    const s = window.App.state;
    const term = (s.filters.search||'').toLowerCase();
    const tags = s.filters.tags || [];
    const favOnly = !!s.filters.favoritesOnly;
    return s.recipes.filter(r => {
      if (favOnly && !r.favorite) return false;
      const matchesTerm = !term || r.title.toLowerCase().includes(term) || (r.ingredients||[]).join(' ').toLowerCase().includes(term);
      const matchesTags = !tags.length || tags.every(t => (r.tags||[]).includes(t));
      return matchesTerm && matchesTags;
    });
  }

  function renderTagsFilter(){
    const allTags = tagSet(window.App.state.recipes);
    const active = new Set(window.App.state.filters.tags);
    const $wrap = $('#activeTags');
    const $list = $('<div class="flex flex-wrap gap-2"></div>');
    allTags.forEach(t => {
      const activeCls = active.has(t) ? 'ring-[color:var(--primary-300)] bg-[color:var(--primary-100)]' : '';
      const $tag = $(`<button class="badge-tag tag-chip ${activeCls}" data-tag="${t}"><span>#${t}</span></button>`);
      $list.append($tag);
    });
    if (allTags.length) { $wrap.removeClass('hidden').empty().append($list); } else { $wrap.addClass('hidden').empty(); }
  }

  function recipeCard(r){
    const tags = (r.tags||[]).map(t => `<span class="badge-tag tag-chip" data-tag="${t}">#${t}</span>`).join(' ');
    const time = r.time ? `<span class="pill">${r.time} min</span>` : '';
    const servings = r.servings ? `<span class="pill">${r.servings} servings</span>` : '';
    return $(`
      <article class="card p-4 recipe-card fade-in-up" data-recipe-id="${r.id}">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="recipe-title text-lg font-bold mb-1">${r.title}</h3>
            <p class="text-sm text-[color:var(--ink-600)]">${r.description || ''}</p>
          </div>
          <button class="star ${r.favorite ? 'fav' : ''}" title="Toggle favorite" aria-label="Toggle favorite">
            ${r.favorite ? '★' : '☆'}
          </button>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">${time}${servings}</div>
        <div class="mt-3 flex flex-wrap gap-2">${tags}</div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button class="btn-secondary text-sm plan-btn">Plan</button>
          <button class="btn-secondary text-sm to-grocery">Add to grocery</button>
          <button class="btn-secondary text-sm edit-recipe">Edit</button>
          <button class="btn-secondary text-sm delete-recipe">Delete</button>
        </div>
      </article>
    `);
  }

  function renderRecipes(){
    const list = filterRecipes();
    const $list = $('#recipeList').empty();
    if (!list.length){
      $('#emptyLibrary').removeClass('hidden');
      return;
    }
    $('#emptyLibrary').addClass('hidden');
    list.forEach(r => $list.append(recipeCard(r)));
  }

  function renderPlanner(){
    const s = window.App.state;
    const $board = $('#plannerBoard').empty();
    U.days.forEach(day => {
      const items = s.planner[day] || [];
      const $day = $(`
        <div class="day-card p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="font-semibold">${day}</span>
            <button class="btn-secondary text-xs add-from-day" data-day="${day}">Add</button>
          </div>
          <div class="flex flex-wrap gap-2">
            ${items.map(id => {
              const r = s.recipes.find(x=>x.id===id);
              if (!r) return '';
              return `<span class="day-recipe" data-id="${id}" data-day="${day}">
                <span>${r.title}</span>
                <button class="btn-secondary text-xs remove-from-day" data-id="${id}" data-day="${day}">✕</button>
              </span>`;
            }).join('')}
          </div>
        </div>
      `);
      $board.append($day);
    });
  }

  function renderGroceries(){
    const s = window.App.state;
    const $ul = $('#groceryList').empty();
    if (!s.grocery.length){
      $ul.append(`<li class="text-sm text-[color:var(--ink-600)]">Your list is empty. Generate from planner or add custom items.</li>`);
      return;
    }
    s.grocery.forEach((g, idx) => {
      const checked = g.checked ? 'checked' : '';
      const li = $(`
        <li class="grocery-item ${g.checked ? 'checked':''}" data-idx="${idx}">
          <input type="checkbox" class="grocery-check" ${checked} aria-label="Mark purchased" />
          <span class="flex-1">${g.label || g.name}</span>
          <button class="btn-secondary text-xs remove-grocery">Remove</button>
        </li>
      `);
      $ul.append(li);
    });
  }

  function openModal(editData){
    $('#modalTitle').text(editData ? 'Edit recipe' : 'New recipe');
    $('#recipeId').val(editData ? editData.id : '');
    $('#recipeTitle').val(editData ? editData.title : '');
    $('#recipeTags').val(editData ? (editData.tags||[]).join(', ') : '');
    $('#recipeServings').val(editData && editData.servings ? editData.servings : '');
    $('#recipeTime').val(editData && editData.time ? editData.time : '');
    $('#recipeFavorite').val(editData && editData.favorite ? 'true' : 'false');
    $('#recipeIngredients').val(editData ? (editData.ingredients||[]).join('\n') : '');
    $('#recipeSteps').val(editData ? (editData.steps||'') : '');
    $('#recipeModal').removeClass('hidden').addClass('flex');
  }
  function closeModal(){ $('#recipeModal').addClass('hidden').removeClass('flex'); }

  function upsertRecipeFromForm(){
    const id = $('#recipeId').val().trim() || U.uid();
    const title = U.sanitize($('#recipeTitle').val());
    if (!title){ alert('Please enter a title.'); return; }
    const tags = $('#recipeTags').val().split(',').map(s=>U.sanitize(s).toLowerCase()).filter(Boolean);
    const servings = parseInt($('#recipeServings').val(), 10) || null;
    const time = parseInt($('#recipeTime').val(), 10) || null;
    const favorite = $('#recipeFavorite').val() === 'true';
    const ingredients = $('#recipeIngredients').val().split(/\n+/).map(U.sanitize).filter(Boolean);
    const steps = U.sanitize($('#recipeSteps').val());

    const existingIdx = window.App.state.recipes.findIndex(r=>r.id===id);
    const recipe = { id, title, tags, servings, time, favorite, ingredients, steps, description: window.App.state.recipes[existingIdx]?.description || '' };
    if (existingIdx >= 0) {
      window.App.state.recipes.splice(existingIdx, 1, recipe);
    } else {
      window.App.state.recipes.unshift(recipe);
    }
    persist();
    renderTagsFilter();
    renderRecipes();
    closeModal();
  }

  function addRecipeToDay(recipeId, day){
    const s = window.App.state;
    if (!s.planner[day]) s.planner[day] = [];
    if (!s.planner[day].includes(recipeId)) s.planner[day].push(recipeId);
    persist();
    renderPlanner();
  }

  function removeRecipeFromDay(recipeId, day){
    const s = window.App.state;
    s.planner[day] = (s.planner[day]||[]).filter(id=>id!==recipeId);
    persist();
    renderPlanner();
  }

  function generateGroceriesFromPlanner(){
    const s = window.App.state;
    const ids = U.days.flatMap(d => s.planner[d]||[]);
    const lines = ids.flatMap(id => (s.recipes.find(r=>r.id===id)?.ingredients)||[]);
    const aggregated = U.aggregateIngredients(lines);
    s.grocery = aggregated.map(a => ({ name: a.name, unit: a.unit, qty: a.qty, checked: false, label: a.label }));
    persist();
    renderGroceries();
  }

  function addRecipeIngredientsToGroceries(recipeId){
    const s = window.App.state;
    const r = s.recipes.find(x=>x.id===recipeId);
    if (!r) return;
    const aggregated = U.aggregateIngredients(r.ingredients||[]);
    const current = s.grocery.slice();
    aggregated.forEach(a => current.push({ name: a.name, unit: a.unit, qty: a.qty, checked: false, label: a.label }));
    s.grocery = current;
    persist();
    renderGroceries();
  }

  function addCustomGroceryLine(line){
    const clean = U.sanitize(line);
    if (!clean) return;
    const parsed = U.parseIngredient(clean);
    const label = [ parsed.qty ? parsed.qty : '', parsed.unit, parsed.name ].filter(Boolean).join(' ').trim() || clean;
    window.App.state.grocery.unshift({ name: parsed.name, unit: parsed.unit, qty: parsed.qty, checked: false, label });
    persist();
    renderGroceries();
  }

  function deleteRecipe(recipeId){
    const s = window.App.state;
    s.recipes = s.recipes.filter(r=>r.id!==recipeId);
    U.days.forEach(d => { s.planner[d] = (s.planner[d]||[]).filter(id=>id!==recipeId); });
    persist();
    renderTagsFilter();
    renderRecipes();
    renderPlanner();
  }

  function bindEvents(){
    // Search and filters
    $('#searchInput').on('input', function(){ window.App.state.filters.search = $(this).val(); persist(); renderRecipes(); });
    $(document).on('keydown', function(e){ if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); $('#searchInput').focus(); } });

    $('#toggleFavorites').on('click', function(){
      const s = window.App.state;
      s.filters.favoritesOnly = !s.filters.favoritesOnly;
      $(this).attr('aria-pressed', s.filters.favoritesOnly ? 'true' : 'false');
      persist(); renderRecipes();
    });
    $('#clearFilters').on('click', function(){ window.App.state.filters = { search:'', tags:[], favoritesOnly:false }; $('#searchInput').val(''); $('#toggleFavorites').attr('aria-pressed','false'); persist(); renderTagsFilter(); renderRecipes(); });

    // Tag click
    $('#activeTags').on('click', '.tag-chip', function(){
      const t = $(this).data('tag');
      const arr = window.App.state.filters.tags;
      const i = arr.indexOf(t);
      if (i>=0) arr.splice(i,1); else arr.push(t);
      persist(); renderTagsFilter(); renderRecipes();
    });

    // Recipe actions
    $('#recipeList').on('click', '.star', function(){
      const id = $(this).closest('[data-recipe-id]').data('recipe-id');
      const r = window.App.state.recipes.find(x=>x.id===id);
      if (!r) return; r.favorite = !r.favorite; persist(); renderRecipes();
    });

    $('#recipeList').on('click', '.plan-btn', function(){
      const id = $(this).closest('[data-recipe-id]').data('recipe-id');
      // Simple day picker
      const $picker = $(`
        <div class="card p-3 absolute z-50 bg-white animate-scale-in" style="min-width:180px;">
          <div class="text-sm font-semibold mb-2">Add to day</div>
          <div class="grid grid-cols-4 gap-2">
            ${U.days.map(d=>`<button class="btn-secondary text-xs choose-day" data-day="${d}" data-id="${id}">${d}</button>`).join('')}
          </div>
        </div>
      `);
      const $btn = $(this);
      $('.day-picker').remove();
      $picker.addClass('day-picker');
      $('body').append($picker);
      const off = $btn.offset();
      $picker.css({ top: off.top + $btn.outerHeight() + 6, left: Math.min(off.left, $(window).width() - $picker.outerWidth() - 8) });
      // Close on click elsewhere
      setTimeout(()=>{
        $(document).one('click', function(){ $picker.remove(); });
        $picker.on('click', function(e){ e.stopPropagation(); });
      },0);
      $picker.on('click', '.choose-day', function(){
        addRecipeToDay($(this).data('id'), $(this).data('day'));
        $picker.remove();
      });
    });

    $('#plannerBoard').on('click', '.remove-from-day', function(){ removeRecipeFromDay($(this).data('id'), $(this).data('day')); });
    $('#plannerBoard').on('click', '.add-from-day', function(){
      const day = $(this).data('day');
      // Quick picker for filtered recipes
      const list = filterRecipes();
      const $menu = $(`
        <div class="card p-3 absolute z-50 bg-white animate-scale-in" style="min-width:220px; max-height:280px; overflow:auto;">
          ${list.map(r=>`<button class="btn-secondary w-full text-left mb-2 add-to-day" data-day="${day}" data-id="${r.id}">${r.title}</button>`).join('') || '<div class="text-sm text-[color:var(--ink-600)]">No recipes match filters.</div>'}
        </div>
      `);
      const $btn = $(this);
      $('body').append($menu);
      const off = $btn.offset();
      $menu.css({ top: off.top + $btn.outerHeight() + 6, left: Math.min(off.left, $(window).width()-$menu.outerWidth()-8) });
      setTimeout(()=>{ $(document).one('click', function(){ $menu.remove(); }); $menu.on('click', function(e){ e.stopPropagation(); }); },0);
      $menu.on('click', '.add-to-day', function(){ addRecipeToDay($(this).data('id'), $(this).data('day')); $menu.remove(); });
    });

    // Grocery actions
    $('#generateGroceries').on('click', generateGroceriesFromPlanner);
    $('#clearGroceries').on('click', function(){ window.App.state.grocery = []; persist(); renderGroceries(); });
    $('#addCustomGrocery').on('click', function(){ addCustomGroceryLine($('#customGroceryInput').val()); $('#customGroceryInput').val(''); });
    $('#customGroceryInput').on('keydown', function(e){ if (e.key==='Enter'){ e.preventDefault(); $('#addCustomGrocery').trigger('click'); }});

    $('#groceryList').on('change', '.grocery-check', function(){
      const idx = $(this).closest('[data-idx]').data('idx');
      const item = window.App.state.grocery[idx];
      if (!item) return; item.checked = !!$(this).prop('checked');
      persist();
      renderGroceries();
    });
    $('#groceryList').on('click', '.remove-grocery', function(){
      const idx = $(this).closest('[data-idx]').data('idx');
      window.App.state.grocery.splice(idx,1); persist(); renderGroceries();
    });

    // Recipe to grocery
    $('#recipeList').on('click', '.to-grocery', function(){ addRecipeIngredientsToGroceries($(this).closest('[data-recipe-id]').data('recipe-id')); });

    // CRUD
    $('#btnAddRecipe, #emptyAddBtn').on('click', function(){ openModal(null); });
    $('[data-close="modal"]').on('click', closeModal);
    $('#recipeModal').on('click', '[data-close="modal"]', closeModal);
    $('#recipeModal').on('click', function(e){ if ($(e.target).is('#recipeModal [data-close="modal"], #recipeModal [data-close="modal"] *')) return; if ($(e.target).is('#recipeModal')) closeModal(); });

    $('#recipeForm').on('submit', function(e){ e.preventDefault(); upsertRecipeFromForm(); });

    $('#recipeList').on('click', '.edit-recipe', function(){
      const id = $(this).closest('[data-recipe-id]').data('recipe-id');
      const r = window.App.state.recipes.find(x=>x.id===id);
      if (r) openModal(r);
    });

    $('#recipeList').on('click', '.delete-recipe', function(){
      const id = $(this).closest('[data-recipe-id]').data('recipe-id');
      if (confirm('Delete this recipe?')) deleteRecipe(id);
    });

    // Add all ingredients of recipe to grocery via context menu on plan picker close handled above
  }

  window.App.init = function(){
    load();
    bindEvents();
    // Initialize UI states
    $('#toggleFavorites').attr('aria-pressed', window.App.state.filters.favoritesOnly ? 'true' : 'false');
    $('#searchInput').val(window.App.state.filters.search || '');
  };

  window.App.render = function(){
    renderTagsFilter();
    renderRecipes();
    renderPlanner();
    renderGroceries();
  };

})(window, jQuery);
