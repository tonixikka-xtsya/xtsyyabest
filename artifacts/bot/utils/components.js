const IS_V2 = 1 << 15;

function container(components, accentColor = null) {
  const c = { type: 17, components };
  if (accentColor !== null) c.accent_color = accentColor;
  return c;
}

function text(content) {
  return { type: 10, content };
}

function separator(spacing = 1, divider = true) {
  return { type: 14, spacing, divider };
}

function section(textContent, thumbnailUrl = null) {
  const s = {
    type: 9,
    components: [{ type: 10, content: textContent }],
  };
  if (thumbnailUrl) {
    s.accessory = { type: 11, media: { url: thumbnailUrl } };
  }
  return s;
}

function mediaGallery(items) {
  return {
    type: 12,
    items: items.map(url => ({ media: { url } })),
  };
}

function actionRow(components) {
  return { type: 1, components };
}

function button(customId, opts = {}) {
  const btn = {
    type: 2,
    style: opts.style !== undefined ? opts.style : 2,
    custom_id: customId,
  };
  if (opts.label !== undefined) btn.label = opts.label;
  if (opts.emoji) btn.emoji = opts.emoji;
  if (opts.disabled) btn.disabled = true;
  return btn;
}

function customEmoji(id, name, animated = false) {
  return { id, name, animated };
}

function v2(components, ephemeral = false) {
  const flags = IS_V2 | (ephemeral ? 64 : 0);
  return { flags, components: Array.isArray(components) ? components : [components] };
}

module.exports = { container, text, separator, section, mediaGallery, actionRow, button, customEmoji, v2, IS_V2 };
