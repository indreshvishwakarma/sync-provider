import RoomStore from "./RoomStore";
class SyncProvider {
  initConnection(socket) {
    return new Promise((resolve, reject) => {
      socket.once("connect", () => {
        resolve(socket);
      });

      socket.once("connect_error", () => {
        reject(new Error("connect_error"));
      });

      socket.once("connect_timeout", () => {
        reject(new Error("connect_timeout"));
      });

      socket.on("connect", () => {
        //reconnection
        this.room_store.connect(socket);
        console.log("connected");
        // if (this.isInited()) this.room_store.emit("connection_changed", true);
      });

      socket.on("disconnect", () => {
        this.isConnected = false;
        // if (this.isInited()) this.room_store.emit("connection_changed", false);
        console.log("dissconnected");
      });
    });
  }

  initRoom(room_name, tab_id = null) {
    this.room_store = new RoomStore(room_name, tab_id);
    return this.room_store;
  }

  initRoomWithVM(room_name, vm, tab_id = null) {
    this.room_store = new RoomStore(room_name, vm, tab_id);
    return this.room_store;
  }

  sync(doc_name) {
    if (this.isInited) {
      const sdoc = this.room_store.get(doc_name);
      if (!!sdoc) {
        sdoc.sync();
      }
    }
  }

  isInited() {
    return !!this.room_store;
  }

  reset() {
    if (!!this.room_store) {
      this.room_store.clean();
    }
  }
}

const syncProvider = new SyncProvider();

export default syncProvider;
