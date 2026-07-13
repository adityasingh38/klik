import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'

export default function App(): JSX.Element {
  return (
    <VStack gap={2} width="100%">
      <Heading level={1}>Klik</Heading>
      <Text>One-click MCP server installer.</Text>
    </VStack>
  )
}
