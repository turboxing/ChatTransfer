# ChatTransfer Backlog

This document records product and engineering work that has been reviewed but is not yet fully implemented. Items are kept here so they can be scheduled without losing the agreed design context.

Status values: `Planned`, `In progress`, `Blocked`, `Done`.

## Multi-room Conversations

- Status: In progress
- Priority: P0
- Estimated effort: 6.5-9 engineering days
- Target: Unify conversations around multi-room support with QR and room-code joining
- Implementation: Core multi-room functionality is complete and tested; pending merge and release.

The full product and engineering proposal is documented in [plan-multi-room-conversations.md](./plan-multi-room-conversations.md). The existing "group chat" concept should be renamed to "room" in the product UI. The current default group chat remains backward compatible as the "Public Lobby" (technical ID: `group_chat`), while new rooms use independent room IDs and room codes.

Key outcomes:

- Users can create multiple rooms for different projects or device groups.
- New devices can join by QR code or by entering a room code.
- Messages, files, attachments, presence, and cleanup are isolated per room.
- The conversation switcher can change rooms without refreshing the page.
- Legacy default group links and history continue to work through the Public Lobby.

## Room Lifecycle and Public Lobby

- Status: In progress
- Priority: P0
- Estimated effort: 1-1.5 engineering days
- Target: Give rooms a complete exit and dissolution lifecycle without creating unsafe shared-room deletion
- Implementation: Exit, dissolution, owner transfer, Public Lobby permissions, admin cleanup, and retention are implemented and tested; pending merge and release.

The full lifecycle and permission proposal is documented in [plan-multi-room-conversations.md](./plan-multi-room-conversations.md).

Key outcomes:

- Any member can leave a normal room without affecting other participants.
- Only the room owner can clear server history or dissolve the room.
- If the owner leaves, ownership transfers to the earliest remaining member.
- The last member leaving automatically dissolves and cleans up the room.
- The former default room is renamed to "Public Lobby", cannot be renamed, left, or dissolved, and has no owner.
- Normal users may only clear their local records in the Public Lobby.
- Server-side cleanup for the Public Lobby is restricted to the instance administrator.
- Idle non-public rooms are automatically deleted after the configured retention period, including their messages and unreferenced attachment files.

## Online Device List and Presence Notices

- Status: In progress
- Priority: P1
- Estimated effort: 2-3 engineering days
- Target: Improve awareness of connected devices during multi-device transfers

### Goal

Let users see which devices are currently connected and receive low-noise notices when a device comes online or disconnects during a conversation.

This is especially useful when a computer is transferring files with multiple test phones and the user needs to distinguish an inactive device from a disconnected one.

### Planned Experience

1. Make the existing `N online` text in the chat header clickable.
2. Open an online-device drawer or popover showing:
   - Nickname
   - IP address
   - Last few characters of the user ID, to distinguish devices with the same nickname
   - Online/offline status
   - A local-device marker for the current client
3. Insert centered, low-emphasis notices into the conversation for stable presence changes:
   - `Test iPhone is online`
   - `Test iPhone disconnected`
4. Presence notices must not:
   - Be persisted to SQLite history
   - Participate in Pin, Top, Copy, QR Code, or batch download actions
   - Appear as normal chat bubbles
5. Private-chat status may stay in the header without inserting presence notices into the conversation.

### Required Engineering Decisions

- Add a 5-10 second offline debounce so mobile backgrounding, network changes, and short Socket.IO reconnects do not create noisy online/offline events.
- Track all socket connections per user. Mark a user offline only after every connection is closed.
- Emit presence changes only when the effective online state changes.
- Keep presence notices as ephemeral frontend state. Do not change the message-history schema.
- Prefer a dedicated presence event, such as `presence_changed`, rather than deriving notices from full user-list snapshots on every client.

### Scope

- `server/room-manager.js`: presence state, connection count, and optional last-seen time.
- `server/socket/index.js`: debounced online/offline events and backward-compatible user-list updates.
- `frontend/src/composables/use-socket.js`: listen for presence events.
- `frontend/src/components/chat/ChatHeader.vue`: make the online count interactive.
- New online-device drawer/popover component.
- `frontend/src/components/ChatLayout.vue`: presence state and ephemeral notice integration.
- Message-list or lightweight notice-layer rendering for presence events.
- Chinese and English translations, tests, and mobile reconnect coverage.

### Cost Breakdown

| Work item | Estimate |
|---|---:|
| Online-device list UI | 0.5-1 day |
| Online-count entry point and status display | 0.2 day |
| Server-side debounce and connection tracking | 0.5-1 day |
| Ephemeral presence notices in chat | 0.5-1 day |
| Multi-tab, reconnect, mobile, and E2E testing | 0.5 day |
| Total | 2-3 days |

### Acceptance Criteria

- Clicking the online count opens a device list with correct online and offline states.
- A newly connected device produces one low-emphasis online notice.
- A disconnected device produces one notice only after the debounce window.
- Brief reconnects do not produce duplicate online/offline notices.
- Multiple tabs for the same user do not incorrectly mark the device offline while one tab remains connected.
- Presence notices disappear on refresh and never enter message history, Pin, or batch-download flows.
- Desktop and mobile layouts remain usable, with no overlap or focus-trap regressions.

### Risks

- Mobile browsers and Socket.IO reconnection may create frequent state changes without debounce.
- The current room manager stores one socket ID per user, so multi-tab handling must be redesigned before presence notices are reliable.
- Injecting notices into the normal message array could break Pin, history, selection, and attachment behavior; ephemeral state is required for the first version.

### Not in Scope for the First Version

- Persistent presence history
- Push notifications
- Cross-server presence
- Device operating-system/browser fingerprinting
