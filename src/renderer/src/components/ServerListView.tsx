import React, { useMemo, useState } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Toolbar } from '@astryxdesign/core/Toolbar'
import { TextInput } from '@astryxdesign/core/TextInput'
import { List, ListItem } from '@astryxdesign/core/List'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import type { ClientId, ClientInfo, MergedServerEntry } from '../../../shared/types'

interface ServerListViewProps {
  servers: MergedServerEntry[]
  clients: ClientInfo[]
  installedServerIds: string[]
  selectedServerIds: string[]
  onChangeSelectedServerIds: (ids: string[]) => void
  selectedClientIds: ClientId[]
  onChangeSelectedClientIds: (ids: ClientId[]) => void
  onInstall: () => void
  isInstalling: boolean
  onUninstall: (serverId: string) => void
}

export function ServerListView(props: ServerListViewProps): React.JSX.Element {
  const {
    servers,
    clients,
    installedServerIds,
    selectedServerIds,
    onChangeSelectedServerIds,
    selectedClientIds,
    onChangeSelectedClientIds,
    onInstall,
    isInstalling,
    onUninstall
  } = props
  const [search, setSearch] = useState('')

  const filteredServers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return servers
    return servers.filter(
      (server) => server.title.toLowerCase().includes(query) || server.description.toLowerCase().includes(query)
    )
  }, [servers, search])

  function toggleServer(serverId: string, checked: boolean): void {
    if (checked) {
      onChangeSelectedServerIds([...selectedServerIds, serverId])
    } else {
      onChangeSelectedServerIds(selectedServerIds.filter((id) => id !== serverId))
    }
  }

  return (
    <VStack gap={4} width="100%">
      <Toolbar
        label="Server filters"
        size="sm"
        startContent={
          <TextInput
            label="Search"
            isLabelHidden
            placeholder="Search MCP servers..."
            value={search}
            onChange={setSearch}
          />
        }
      />

      <CheckboxList
        label="Install into"
        value={selectedClientIds}
        onChange={(values) => onChangeSelectedClientIds(values as ClientId[])}
      >
        {clients.map((client) => (
          <CheckboxListItem
            key={client.id}
            value={client.id}
            label={client.displayName}
            isDisabled={!client.installed}
            description={client.installed ? undefined : 'Not detected on this machine'}
          />
        ))}
      </CheckboxList>

      <List header="MCP servers" hasDividers density="compact">
        {filteredServers.map((server) => {
          const isInstalled = installedServerIds.includes(server.id)
          return (
            <ListItem
              key={server.id}
              label={server.title}
              description={server.description}
              startContent={
                <CheckboxInput
                  label={`Select ${server.title}`}
                  isLabelHidden
                  value={selectedServerIds.includes(server.id)}
                  onChange={(checked) => toggleServer(server.id, checked)}
                />
              }
              endContent={
                <HStack gap={2} vAlign="center">
                  {server.curation?.verified && <Badge variant="info" label="Verified" />}
                  {isInstalled && <Badge variant="success" label="Installed" />}
                  {isInstalled && (
                    <Button
                      label="Uninstall"
                      variant="destructive"
                      size="sm"
                      onClick={() => onUninstall(server.id)}
                    />
                  )}
                </HStack>
              }
            />
          )
        })}
      </List>

      <HStack justify="end" gap={2}>
        <Text type="supporting">{selectedServerIds.length} selected</Text>
        <Button
          label="Get Your Klik"
          variant="primary"
          isDisabled={selectedServerIds.length === 0 || selectedClientIds.length === 0}
          isLoading={isInstalling}
          onClick={onInstall}
        />
      </HStack>
    </VStack>
  )
}
