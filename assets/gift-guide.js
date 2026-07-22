(() => {
  if (window.GiftGuideTheme) return;

  const SECTION_SELECTOR = '[data-gg-grid]';

  const normalize = (value) => String(value || '').trim().toLowerCase();

  const parseJson = (value) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Gift guide JSON parse failed', error);
      return null;
    }
  };

  const optionValueForIndex = (variant, index) => variant[`option${index + 1}`] || '';

  const findFirstAvailableVariant = (product) => {
    return (product.variants || []).find((variant) => variant.available) || (product.variants || [])[0] || null;
  };

  const getSelectionsFromVariant = (product, variant) => {
    const selections = {};
    (product.options || []).forEach((optionName, index) => {
      selections[optionName] = optionValueForIndex(variant, index);
    });
    return selections;
  };

  const findVariant = (product, selections) => {
    return (product.variants || []).find((variant) => {
      return (product.options || []).every((optionName, index) => {
        return normalize(optionValueForIndex(variant, index)) === normalize(selections[optionName]);
      });
    }) || null;
  };

  const variantExistsWithCandidate = (product, selections, optionName, optionValue) => {
    return (product.variants || []).some((variant) => {
      return (product.options || []).every((name, index) => {
        const requested = name === optionName ? optionValue : selections[name];
        return normalize(optionValueForIndex(variant, index)) === normalize(requested);
      });
    });
  };

  const buildOptionGroups = (product) => {
    return (product.options || []).map((optionName, index) => {
      const seen = new Set();
      const values = [];

      (product.variants || []).forEach((variant) => {
        const value = optionValueForIndex(variant, index);
        if (value && !seen.has(value)) {
          seen.add(value);
          values.push(value);
        }
      });

      return { name: optionName, index, values };
    });
  };

  const variantMatchesRule = (variant, ruleOne, ruleTwo) => {
    const values = [variant?.option1, variant?.option2, variant?.option3].filter(Boolean).map(normalize);
    return values.includes(normalize(ruleOne)) && values.includes(normalize(ruleTwo));
  };

  const pickCompanionVariant = (product, activeVariant) => {
    if (!product) return null;

    const activeValues = [activeVariant?.option1, activeVariant?.option2, activeVariant?.option3]
      .filter(Boolean)
      .map(normalize);

    const matchingVariant = (product.variants || []).find((variant) => {
      if (!variant.available) return false;
      const candidateValues = [variant.option1, variant.option2, variant.option3].filter(Boolean).map(normalize);
      return activeValues.every((value) => candidateValues.includes(value));
    });

    return matchingVariant || findFirstAvailableVariant(product);
  };

  const setStatus = (node, message, type = '') => {
    if (!node) return;
    node.textContent = message || '';
    node.classList.toggle('is-error', type === 'error');
    node.classList.toggle('is-success', type === 'success');
  };

  const renderOptions = (container, product, selections) => {
    const optionGroups = buildOptionGroups(product);
    container.innerHTML = '';

    optionGroups.forEach((group) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'gg-option-group';

      const legend = document.createElement('legend');
      legend.className = 'gg-option-group__legend';
      legend.textContent = group.name;

      const values = document.createElement('div');
      values.className = 'gg-option-group__values';

      group.values.forEach((value) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gg-option-button';
        button.dataset.ggOptionButton = 'true';
        button.dataset.optionName = group.name;
        button.dataset.optionValue = value;
        button.textContent = value;

        const isActive = normalize(selections[group.name]) === normalize(value);
        const isCompatible = variantExistsWithCandidate(product, selections, group.name, value);

        button.classList.toggle('is-active', isActive);
        button.classList.toggle('is-unavailable', !isCompatible);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

        values.appendChild(button);
      });

      fieldset.appendChild(legend);
      fieldset.appendChild(values);
      container.appendChild(fieldset);
    });
  };

  const createState = (section) => ({
    section,
    activeProduct: null,
    activeVariant: null,
    selections: {},
    ruleOne: section.dataset.triggerOne || 'Black',
    ruleTwo: section.dataset.triggerTwo || 'Medium',
    companionProduct: parseJson(section.querySelector('[data-gg-companion-json]')?.textContent || 'null'),
    modal: section.querySelector('[data-gg-modal]'),
    nodes: {
      title: section.querySelector('[data-gg-modal-title]'),
      price: section.querySelector('[data-gg-modal-price]'),
      description: section.querySelector('[data-gg-modal-description]'),
      image: section.querySelector('[data-gg-modal-image]'),
      options: section.querySelector('[data-gg-modal-options]'),
      addButton: section.querySelector('[data-gg-add-to-cart]'),
      status: section.querySelector('[data-gg-modal-status]')
    }
  });

  const syncVariant = (state) => {
    const resolvedVariant = findVariant(state.activeProduct, state.selections) || findFirstAvailableVariant(state.activeProduct);
    state.activeVariant = resolvedVariant;
    if (resolvedVariant) state.selections = getSelectionsFromVariant(state.activeProduct, resolvedVariant);
  };

  const renderModal = (state) => {
    const { activeProduct, activeVariant, nodes } = state;
    if (!activeProduct || !activeVariant) return;

    nodes.title.textContent = activeProduct.title || '';
    nodes.price.textContent = activeVariant.priceFormatted || '';
    nodes.description.textContent = activeProduct.description || '';
    nodes.image.src = activeVariant.featuredImage || activeProduct.featuredImage || '';
    nodes.image.alt = activeProduct.title || '';
    nodes.addButton.disabled = !activeVariant.available;
    nodes.addButton.setAttribute('aria-disabled', activeVariant.available ? 'false' : 'true');

    const label = nodes.addButton.querySelector('span');
    label.textContent = activeVariant.available ? 'ADD TO CART' : 'SOLD OUT';

    renderOptions(nodes.options, activeProduct, state.selections);
    setStatus(nodes.status, '');
  };

  const openModal = (state, card) => {
    const product = parseJson(card.querySelector('.gg-product-json')?.textContent || 'null');
    if (!product) return;

    state.activeProduct = product;
    state.activeVariant = findFirstAvailableVariant(product);
    state.selections = state.activeVariant ? getSelectionsFromVariant(product, state.activeVariant) : {};

    renderModal(state);
    state.modal.hidden = false;
    document.body.classList.add('gg-modal-open');
  };

  const closeModal = (state) => {
    state.modal.hidden = true;
    setStatus(state.nodes.status, '');
    document.body.classList.remove('gg-modal-open');
  };

  const addItemsToCart = async (items) => {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ items })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.description || 'Unable to add this item to cart.');
    }

    return response.json();
  };

  const handleAddToCart = async (state) => {
    if (!state.activeVariant) return;

    const button = state.nodes.addButton;
    const label = button.querySelector('span');
    const defaultLabel = label.textContent;

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    label.textContent = 'ADDING...';
    setStatus(state.nodes.status, 'Adding product to cart...');

    try {
      const items = [{ id: state.activeVariant.id, quantity: 1 }];

      if (
        state.companionProduct &&
        state.activeProduct?.handle !== state.companionProduct?.handle &&
        variantMatchesRule(state.activeVariant, state.ruleOne, state.ruleTwo)
      ) {
        const companionVariant = pickCompanionVariant(state.companionProduct, state.activeVariant);
        if (companionVariant) items.push({ id: companionVariant.id, quantity: 1 });
      }

      await addItemsToCart(items);
      setStatus(
        state.nodes.status,
        items.length > 1
          ? 'Added to cart. Soft Winter Jacket was added automatically too.'
          : 'Added to cart successfully.',
        'success'
      );
      label.textContent = 'ADDED';

      if (typeof window.publish === 'function') {
        window.publish('cart-update', { source: 'gift-guide', items });
      }
    } catch (error) {
      console.error(error);
      setStatus(state.nodes.status, error.message || 'Unable to add this item to cart.', 'error');
      label.textContent = defaultLabel;
    } finally {
      button.disabled = !state.activeVariant?.available;
      button.removeAttribute('aria-busy');
      window.setTimeout(() => {
        if (!button.disabled) label.textContent = defaultLabel;
      }, 1800);
    }
  };

  const initSection = (section) => {
    if (!section || section.dataset.ggInitialized === 'true') return;
    section.dataset.ggInitialized = 'true';

    const state = createState(section);
    if (!state.modal) return;

    section.addEventListener('click', (event) => {
      const openTrigger = event.target.closest('[data-gg-open-product]');
      if (openTrigger) {
        const card = openTrigger.closest('.gg-grid__card');
        if (card) openModal(state, card);
        return;
      }

      const closeTrigger = event.target.closest('[data-gg-close-modal]');
      if (closeTrigger) {
        closeModal(state);
        return;
      }

      const optionTrigger = event.target.closest('[data-gg-option-button]');
      if (optionTrigger) {
        state.selections[optionTrigger.dataset.optionName] = optionTrigger.dataset.optionValue;
        syncVariant(state);
        renderModal(state);
        return;
      }

      if (event.target.closest('[data-gg-add-to-cart]')) {
        handleAddToCart(state);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !state.modal.hidden) closeModal(state);
    });
  };

  const initAll = (root = document) => {
    root.querySelectorAll(SECTION_SELECTOR).forEach(initSection);
  };

  window.GiftGuideTheme = { initAll, initSection };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => {
    initAll(event.target);
  });
})();
