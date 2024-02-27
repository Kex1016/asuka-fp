export default {
  name: "test",
  type: "ready",
  once: true,
  handler: async () => {
    console.log("Test event fired!");
  },
};
