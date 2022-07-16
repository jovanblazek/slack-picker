import { App } from '@slack/bolt'
import { difference } from 'lodash'
import Log from './logger'

const MODERATOR_COUNT = 2
const CONVERSATION_MEMBERS_LIMIT = 50

interface SendMessageOptions {
  channelId: string
  userId?: string
  text: string
}

export const sendMessage = async (
  { channelId, userId, text }: SendMessageOptions,
  slackAppInstance: App
) => {
  if (userId) {
    await slackAppInstance.client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text,
      link_names: true,
    })
    return
  }
  await slackAppInstance.client.chat.postMessage({
    channel: channelId,
    text,
    link_names: true,
  })
}

export const getModerators = async (
  { channelId, ignoredMembers = [] }: { channelId: string; ignoredMembers?: string[] },
  slackAppInstance: App
) => {
  try {
    // get channel member ids
    const { members: channelMembers } = await slackAppInstance.client.conversations.members({
      channel: channelId,
      limit: CONVERSATION_MEMBERS_LIMIT,
    })
    if (!channelMembers) {
      throw new Error('No channel members found while getting moderators')
    }

    // filter out ignored members
    const filteredChannelMembers = difference(channelMembers, ignoredMembers)
    if (!filteredChannelMembers || !filteredChannelMembers.length) {
      throw new Error('No members left to pick from')
    }

    // get profile of every channel member
    const memberProfiles = await Promise.allSettled(
      filteredChannelMembers.map((member) =>
        slackAppInstance.client.users.info({
          user: member,
        })
      )
    )

    // filter out members who are not bots
    const humanMembers = memberProfiles.reduce((acc, memberPromise) => {
      if (memberPromise.status === 'fulfilled') {
        const { value: member } = memberPromise
        if (member?.user && !member.user?.is_bot && member.user?.id) {
          return [...acc, member.user.id]
        }
      }
      return acc
    }, [] as string[])

    if (!humanMembers.length) {
      throw new Error('No human channel members found while getting moderators')
    }

    // pick two random moderators
    const moderators: string[] = []
    while (moderators.length < MODERATOR_COUNT && moderators.length !== humanMembers.length) {
      const moderator = humanMembers[Math.floor(Math.random() * humanMembers.length)]
      if (!moderators.includes(moderator)) {
        moderators.push(moderator)
      }
    }
    return moderators
  } catch (error) {
    Log.error(error)
    return null
  }
}
