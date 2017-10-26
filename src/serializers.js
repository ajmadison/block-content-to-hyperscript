const objectAssign = require('object-assign')
const getImageUrl = require('./getImageUrl')

module.exports = h => {
  // Low-level block serializer
  function BlockSerializer(props) {
    const {node, serializers, options, isInline, children} = props
    const blockType = node._type
    const serializer = serializers.types[blockType]
    if (!serializer) {
      throw new Error(
        `Unknown block type "${blockType}", please specify a serializer for it in the \`serializers.types\` prop`
      )
    }

    return h(serializer, {node, options, isInline}, children)
  }

  // Low-level span serializer
  function SpanSerializer(props) {
    const {mark, children} = props.node
    const isPlain = typeof mark === 'string'
    const markType = isPlain ? mark : mark._type
    const serializer = props.serializers.marks[markType]
    if (!serializer) {
      throw new Error(
        `Unknown mark type "${markType}", please specify a serializer for it in the \`serializers.marks\` prop`
      )
    }

    return h(serializer, props.node, children)
  }

  // Low-level list serializer
  function ListSerializer(props) {
    const tag = props.type === 'bullet' ? 'ul' : 'ol'
    return h(tag, null, props.children)
  }

  // Low-level list item serializer
  function ListItemSerializer(props) {
    return h('li', null, props.children)
  }

  // Renderer of an actual block of type `block`. Confusing, we know.
  function BlockTypeSerializer(props) {
    const style = props.node.style || 'normal'

    if (/^h\d/.test(style)) {
      return h(style, null, props.children)
    }

    return style === 'blockquote'
      ? h('blockquote', null, props.children)
      : h('p', null, props.children)
  }

  // Serializers for things that can be directly attributed to a tag without any props
  // We use partial application to do this, passing the tag name as the first argument
  function RawMarkSerializer(tag, props) {
    return h(tag, null, props.children)
  }

  function UnderlineSerializer(props) {
    return h('span', {style: {textDecoration: 'underline'}}, props.children)
  }

  function StrikeThroughSerializer(props) {
    return h('del', null, props.children)
  }

  function LinkSerializer(props) {
    return h('a', {href: props.mark.href}, props.children)
  }

  function ImageSerializer(props) {
    const img = h('img', {src: getImageUrl(props)})
    return props.isInline ? img : h('figure', null, img)
  }

  // Serializer that recursively calls itself, producing a hyperscript tree of spans
  function serializeSpan(span, serializers, index) {
    if (span === '\n' && serializers.hardBreak) {
      return h(serializers.hardBreak, {key: `hb-${index}`})
    }

    if (typeof span === 'string') {
      return span
    }

    const serializedNode = objectAssign({}, span, {
      children: span.children.map((child, i) => serializeSpan(child, serializers, i))
    })

    return h(serializers.span, {
      key: span._key || `span-${index}`,
      node: serializedNode,
      serializers
    })
  }

  const HardBreakSerializer = () => h('br')
  const defaultMarkSerializers = {
    strong: RawMarkSerializer.bind(null, 'strong'),
    em: RawMarkSerializer.bind(null, 'em'),
    code: RawMarkSerializer.bind(null, 'code'),
    underline: UnderlineSerializer,
    'strike-through': StrikeThroughSerializer,
    link: LinkSerializer
  }

  const defaultSerializers = {
    // Common overrides
    types: {
      block: BlockTypeSerializer,
      image: ImageSerializer
    },
    marks: defaultMarkSerializers,

    // Less common overrides
    list: ListSerializer,
    listItem: ListItemSerializer,

    block: BlockSerializer,
    span: SpanSerializer,
    hardBreak: HardBreakSerializer
  }

  return {
    defaultSerializers,
    serializeSpan
  }
}
