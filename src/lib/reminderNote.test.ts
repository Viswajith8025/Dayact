import assert from 'node:assert/strict'
import test from 'node:test'
import { reminderNote } from './reminderNote.ts'

test('says the poke was sent only after a delivery', () => {
  assert.equal(
    reminderNote({ ok: true, delivered: 1, subscriptions: 1 }, 'Meethu'),
    'Funny poke sent',
  )
  assert.equal(
    reminderNote({ ok: true, delivered: 1, subscriptions: 1, deduped: true }, 'Meethu'),
    'Already poked today',
  )
})

test('does not claim a poke when nothing was delivered', () => {
  assert.equal(
    reminderNote({ ok: true, delivered: 0, subscriptions: 0, deduped: true }, 'Meethu'),
    "Meethu hasn't turned on notifications",
  )
  assert.equal(
    reminderNote({ ok: true, delivered: 0, subscriptions: 2 }, 'Meethu'),
    "Couldn't deliver the poke. Try again.",
  )
  assert.equal(
    reminderNote({ ok: true, delivered: 0, subscriptions: 0 }, '  '),
    "Your partner hasn't turned on notifications",
  )
})

test('passes through a hard failure', () => {
  assert.equal(reminderNote({ ok: false, error: 'No partner' }, 'Meethu'), 'No partner')
})
