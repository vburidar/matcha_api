export default async function socketControl(io) {
  let timeout = null;
  io.on('connection', async (socket) => {
    try {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
        console.log('reconnection');
      } else {
        console.log('connection');
      }

      socket.on('disconnect', async () => {
        console.log('disconnection pending...');
        timeout = setTimeout(async () => {
          console.log('disconnection');
        }, 2000);
      });
    } catch (err) {
      console.log('ERR : ', err);
    }
  });
}
