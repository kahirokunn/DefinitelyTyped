import { Socket, Channel, Presence, Timer } from 'phoenix';

function test_socket() {
  const socket = new Socket('/ws', {
    binaryType: 'arraybuffer',
    params: { userToken: '123' },
    reconnectAfterMs: tries => 1000,
    rejoinAfterMs: tries => 1000,
    vsn: '2.0.0',
  });
  socket.connect();

  const openRef = socket.onOpen(() => {
    console.log('Socket opened');
  });
  const closeRef = socket.onClose(() => {
    console.log('Socket closed');
  });
  const errorRef = socket.onError(() => {
    console.log('Error on socket');
  });
  const messageRef = socket.onMessage(() => {
    console.log('Message on socket');
  });

  socket.off([openRef, closeRef, errorRef, messageRef]);
}

function test_channel() {
  const socket = new Socket('/ws', { params: { userToken: '123' } });
  socket.connect();

  const channel = socket.channel('room:123', { token: '123' });

  channel.on('new_msg', msg => console.log('Got message', msg));

  channel
    .push('new_msg', { body: 'some value' }, 10000)
    .receive('ok', msg => console.log('created message', msg))
    .receive('error', reasons => console.log('create failed', reasons))
    .receive('timeout', () => console.log('Networking issue...'));

  channel
    .join()
    .receive('ok', ({ messages }) => console.log('catching up', messages))
    .receive('error', ({ reason }) => console.log('failed join', reason))
    .receive('timeout', () => console.log('Networking issue. Still waiting...'));
}

function test_hooks() {
  const socket = new Socket('/ws', { params: { userToken: '123' } });
  socket.connect();

  socket.onError(() => console.log('there was an error with the connection!'));
  socket.onClose(() => console.log('the connection dropped'));

  const channel = socket.channel('room:123', { token: '123' });

  channel.onError(() => console.log('there was an error!'));
  channel.onClose(() => console.log('the channel has gone away gracefully'));
}

function test_presence() {
  const socket = new Socket('/ws', { params: { userToken: '123' } });

  const channel = socket.channel('room:123', { token: '123' });
  const presence = new Presence(channel);

  let presenceState = {};

  const logState = (state: object) => {
    Presence.list(state, (id: string) => id).forEach(console.log);
  };

  channel.on('presence_state', state => {
    presenceState = Presence.syncState(presenceState, state);
    logState(presenceState);
  });

  channel.on('presence_diff', diff => {
    presenceState = Presence.syncState(presenceState, diff);
    logState(presenceState);
  });

  socket.connect();

  channel.join();
}

function test_timer() {
  const reconnectTimer = new Timer(
    () => console.log('connect'),
    tries => [1000, 5000, 10000][tries - 1] || 10000,
  );
  reconnectTimer.scheduleTimeout(); // fires after 5000
  reconnectTimer.reset();
}
