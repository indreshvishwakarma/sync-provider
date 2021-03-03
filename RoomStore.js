import SyncDoc from "./SyncDoc";
const EventEmitter = require("events");

const { default: PQueue } = require("p-queue");

const queue = new PQueue({ concurrency: 1 });
queue.on("add", () => {
  console.log(`Task is added.  Size: ${queue.size}  Pending: ${queue.pending}`);
});
queue.on("next", () => {
  console.log(
    `Task is completed.  Size: ${queue.size}  Pending: ${queue.pending}`
  );
});

class RoomStore extends EventEmitter {
  constructor(name, vm = null, tab_id = null) {
    super();
    this.name = name;
    this.tab_id = tab_id;
    this.vm = vm;
    this.stores = {};
    this.isConnected = true;
    this.add_store("shared", { channel: this.name });
    console.log("inited vm ", this.vm);

    this.onApply();
  }

  add_store(doc_name, props) {
    let sync_doc = new SyncDoc(this.name, props);
    this.stores[`${this.name}-${doc_name}`] = sync_doc;

    sync_doc.registerOnUpdate((doc, changes) => {
      this.emit(`${doc_name}-update`, sync_doc, changes);
      this.emit("update", sync_doc, changes, doc_name);
    });
    return sync_doc;
  }

  get_doc(doc_name) {
    return this.stores[`${this.name}-${doc_name}`];
  }

  get_doc_name(doc_name) {
    return `${this.name}-${doc_name}`;
  }

  connect(socket) {
    this.socket = socket;

    this.socket.on("inited", (docs) => {
      console.log("inited");
      docs.map((doc) => {
        let sdoc = this.get_doc(doc.doc_name);
        sdoc.apply_update(doc.updated_sv, doc.diff);
      });

      this.emit("inited");
    });

    this.socket.on("apply", (doc_name, diff, updated_sv) => {
      console.log("got apply", doc_name);
      let doc = this.get_doc(doc_name);
      if (doc) {
        doc.apply_update(updated_sv, diff);
      }
    });

    this.on("update", (sync_doc, diff, doc_name) => {
      if (doc_name === this.tab_id && sync_doc.owner_type === "guest")
        sync_doc.sync(socket, doc_name);
    });
  }

  clean() {
    Object.values(this.stores).map((v) => v.reset());
  }

  start_applying() {
    this.isConnected = true;
    let doc = this.get_doc(this.tab_id);
    queue.add(() => this.apply_vm(doc));
  }

  stop_applying() {
    this.isConnected = false;
  }

  onApply() {
    let counter = 1;
    this.on(`${this.tab_id}-update`, (doc, diff) => {
      counter = counter + 1;
      let i = counter;
      if (this.isConnected) {
        queue.add(() => {
          console.log("start,", i);
          return this.apply_vm(doc)
            .then(() => console.log("end,", i))
            .catch((err) => console.log("end error", i, err));
        });
      }
    });
  }

  apply_vm(doc) {
    if (!!!this.vm) {
      return;
    }

    let root = doc.ydoc.getMap("root");

    if (!!!root) return;
    const target = root.get("target");
    if (!!!target) return;
    const vm_data = JSON.parse(target);

    console.log(
      "🚀 ~ file: RoomStore.js ~ line 114 ~ RoomStore ~ apply_vm ~ vm_data",
      vm_data
    );

    if (!!vm_data.targets.length > 0) {
      vm_data.projectVersion = 3;
      return this.vm.deserializeProject(vm_data, null).then(() => {
        console.log("deserialized");
      });
    } else {
      return Promise.resolve("nothing to update");
    }
  }

  set_tab_visible(tab_id, visibility) {
    if (this.socket) {
      this.socket.emit("tab_visibility", tab_id, visibility);
    }
  }

  initMe(user) {
    let channel = this.tab_id ? this.tab_id : user.id;
    this.add_store(this.tab_id || user.id, {
      channel: channel,
      owner_id: user.id,
      owner_type: user.role,
    });

    if (this.socket) {
      let docs_to_init = ["shared", this.tab_id || user.id].map((doc_name) => {
        let doc = this.get_doc(doc_name);
        return {
          doc_name,
          channel: doc.channel,
          client_sv: doc.ssv,
        };
      });

      this.socket.emit("initMe", docs_to_init);

      if (this.tab_id) {
        this.socket.emit("connect_tab", this.tab_id);
        console.log("connecting to ", this.tab_id);
      }
    }
  }
}

export default RoomStore;
