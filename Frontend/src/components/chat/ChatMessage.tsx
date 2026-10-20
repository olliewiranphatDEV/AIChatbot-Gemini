import { blocksToText } from '../../api/chatMessages.ts'
import { typography } from '../../styles/typography.ts'
import type { ChatMessageData, MessageBlock } from '../../types/chat.ts'
import BrandLogo from '../shared/BrandLogo.tsx'

type ChatMessageProps = {
  message: ChatMessageData
}

function blockSpacing(blocks: readonly MessageBlock[], index: number): string {
  if (index === 0) return ''
  if (blocks[index].type === 'list') return 'mt-[0.625rem]'
  return blocks[index - 1].type === 'list' ? 'mt-[1.5rem]' : 'mt-[0.75rem]'
}

function UserMessage({ message }: ChatMessageProps) {
  const partial = message.status === 'streaming' || message.status === 'interrupted'
  return (
    <div className="flex flex-col items-end">
      <div className={`${typography.body} max-w-[85%] rounded-[1rem] ${partial ? 'border border-dashed border-line-strong bg-fill' : 'bg-bubble'} px-[1rem] py-[0.75rem] [overflow-wrap:anywhere] text-ink lg:max-w-[48rem] lg:px-[1.375rem] lg:py-[0.96875rem]`}>
        {message.blocks.map((block, index) =>
          block.type === 'paragraph' ? (
            <p key={index} className={`whitespace-pre-line ${index > 0 ? 'mt-[0.5rem]' : ''}`}>
              {block.text}
            </p>
          ) : null,
        )}
      </div>
      {(message.sentAt || message.source === 'voice') && (
        <p className={`${typography.metadata} mt-[0.375rem] text-muted lg:mt-[0.625rem]`}>
          You{message.sentAt ? ` · ${message.sentAt}` : ''}
          {message.source === 'voice' ? ' · Voice' : ''}
          {message.status === 'streaming' ? ' · Listening...' : ''}
          {message.status === 'interrupted' ? ' · Incomplete' : ''}
        </p>
      )}
    </div>
  )
}

function AssistantMessage({ message }: ChatMessageProps) {
  const generating = message.status === 'generating'
  const failed = message.status === 'error'
  const speaking = message.status === 'streaming'
  const interrupted = message.status === 'interrupted'
  const lastIndex = message.blocks.length - 1

  return (
    <div className="flex items-start gap-[0.625rem] lg:mb-[0.125rem] lg:gap-[0.8125rem] lg:pl-[0.6875rem]">
      <BrandLogo className="size-[2.25rem] shrink-0 lg:size-[3.0625rem]" color="var(--color-logo-deep)" />
      <div className="min-w-0 flex-1">
        <p className={`${typography.messageAuthor} pl-[0.375rem] text-ink lg:mt-[0.375rem] lg:pl-[0.5rem]`}>
          AI Chat
        </p>
        <div
          className={`${typography.body} mt-[0.5rem] w-fit max-w-full rounded-[1rem] border ${speaking || interrupted ? 'border-dashed border-line-strong' : 'border-line'} ${interrupted ? 'bg-fill text-ink-2' : 'bg-surface'} px-[1rem] pt-[0.875rem] pb-[1rem] [overflow-wrap:anywhere] ${interrupted ? '' : 'text-ink'} lg:mt-[0.6875rem] lg:max-w-[48rem] lg:px-[1.5rem] lg:pt-[1.25rem] lg:pb-[1.34rem] ${
            generating ? 'min-w-[min(100%,42.875rem)]' : ''
          }`}
        >
          {failed && (
            <p role="alert" className={`${typography.description} whitespace-pre-line text-danger`}>
              {blocksToText(message.blocks)}
            </p>
          )}
          {!failed && message.blocks.map((block, index) => {
            const spacing = blockSpacing(message.blocks, index)
            if (block.type === 'list') {
              return (
                <ol key={index} role="list" className={`ol-counter list-none ${spacing}`}>
                  {block.items.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="flex before:w-[1.75rem] before:shrink-0 before:pl-[0.25rem] lg:before:w-[2.4375rem] lg:before:pl-[0.375rem]"
                    >
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ol>
              )
            }
            return (
              <p key={index} className={`whitespace-pre-line ${spacing}`}>
                {block.text}
                {(generating || speaking) && index === lastIndex && (
                  <span
                    aria-hidden="true"
                    className="ml-[0.25rem] inline-block h-[1.4375rem] w-[0.125rem] -my-[0.5rem] bg-brand-alt align-middle"
                  />
                )}
              </p>
            )
          })}
          {generating && (
            <p
              role="status"
              className={`${typography.status} mt-[0.75rem] text-muted`}
            >
              Generating response...
            </p>
          )}
          {(speaking || interrupted) && (
            <p className={`${typography.status} mt-[0.75rem] text-muted`}>
              {speaking ? 'Speaking...' : 'Interrupted — this reply was cut off.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatMessage({ message }: ChatMessageProps) {
  return message.role === 'user' ? (
    <UserMessage message={message} />
  ) : (
    <AssistantMessage message={message} />
  )
}
