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
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[85%] rounded-[1rem] bg-[#e7eeea] px-[1rem] py-[0.75rem] text-[clamp(0.9375rem,3.8vw,1.2563rem)] leading-[1.55] [overflow-wrap:anywhere] text-[#050a12] lg:max-w-[48rem] lg:px-[1.375rem] lg:py-[0.96875rem]">
        {message.blocks.map((block, index) =>
          block.type === 'paragraph' ? (
            <p key={index} className={index > 0 ? 'mt-[0.5rem]' : undefined}>
              {block.text}
            </p>
          ) : null,
        )}
      </div>
      {message.sentAt && (
        <p className="mt-[0.375rem] text-[clamp(0.8125rem,3vw,1.035rem)] leading-6 text-[#74777e] lg:mt-[0.625rem]">
          You · {message.sentAt}
        </p>
      )}
    </div>
  )
}

function AssistantMessage({ message }: ChatMessageProps) {
  const generating = message.status === 'generating'
  const lastIndex = message.blocks.length - 1

  return (
    <div className="flex items-start gap-[0.625rem] lg:mb-[0.125rem] lg:gap-[0.8125rem] lg:pl-[0.6875rem]">
      <BrandLogo className="size-[2.25rem] shrink-0 lg:size-[3.0625rem]" color="#0d5c4b" />
      <div className="min-w-0 flex-1">
        <p className="pl-[0.375rem] text-[clamp(0.9375rem,3.6vw,1.105rem)] leading-6 font-semibold text-[#050a12] lg:mt-[0.375rem] lg:pl-[0.5rem]">
          AI Chat
        </p>
        <div
          className={`mt-[0.5rem] w-fit max-w-full rounded-[1rem] border border-[#e5e7e8] bg-white px-[1rem] pt-[0.875rem] pb-[1rem] text-[clamp(0.9375rem,3.8vw,1.2375rem)] leading-[1.55] [overflow-wrap:anywhere] text-[#050a12] lg:mt-[0.6875rem] lg:max-w-[48rem] lg:px-[1.5rem] lg:pt-[1.25rem] lg:pb-[1.34rem] ${
            generating ? 'min-w-[min(100%,42.875rem)]' : ''
          }`}
        >
          {message.blocks.map((block, index) => {
            const spacing = blockSpacing(message.blocks, index)
            if (block.type === 'list') {
              return (
                <ol key={index} role="list" className={`ol-counter list-none ${spacing}`}>
                  {block.items.map((item) => (
                    <li
                      key={item}
                      className="flex before:w-[1.75rem] before:shrink-0 before:pl-[0.25rem] lg:before:w-[2.4375rem] lg:before:pl-[0.375rem]"
                    >
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ol>
              )
            }
            return (
              <p key={index} className={spacing}>
                {block.text}
                {generating && index === lastIndex && (
                  <span
                    aria-hidden="true"
                    className="ml-[0.25rem] inline-block h-[1.4375rem] w-[0.125rem] -my-[0.5rem] bg-[#1a6a5b] align-middle"
                  />
                )}
              </p>
            )
          })}
          {generating && (
            <p
              role="status"
              className="mt-[0.75rem] text-[clamp(0.8125rem,3vw,0.95rem)] leading-[1.375rem] text-[#7b7e85]"
            >
              Generating response...
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
