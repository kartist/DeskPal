// Hello World Plugin for DeskPal
// 注意: 不要用 IIFE 包裹！React 和 exports 由外层 new Function('React','exports',code) 注入

var useState = React.useState;
var useCallback = React.useCallback;
var createElement = React.createElement;

function HelloPlugin() {
  var nameState = useState("");
  var name = nameState[0];
  var setName = nameState[1];
  var greetingState = useState("");
  var greeting = greetingState[0];
  var setGreeting = greetingState[1];

  var handleGreet = useCallback(function() {
    if (name.trim()) {
      setGreeting("Hello, " + name.trim() + "! \uD83D\uDC4B");
    } else {
      setGreeting("Please enter your name above \u261D\uFE0F");
    }
  }, [name]);

  return createElement("div", { className: "tool-panel hp-container" },
    createElement("div", { style: { marginBottom: 12 } },
      createElement("h3", { style: { fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" } }, "\uD83C\uDF89 Hello World Plugin"),
      createElement("p", { style: { fontSize: 12, color: "var(--text-muted)", marginBottom: 8 } }, "This is an external plugin loaded dynamically from disk.")
    ),
    createElement("input", {
      className: "tool-input",
      type: "text",
      placeholder: "Enter your name...",
      value: name,
      onChange: function(e) { setName(e.target.value); },
      style: { marginBottom: 8 }
    }),
    createElement("button", {
      className: "action-btn",
      onClick: handleGreet,
      style: { marginBottom: 12 }
    }, "Say Hello"),
    greeting && createElement("div", {
      className: "tool-output",
      style: { fontSize: 16, fontWeight: 600, textAlign: "center", padding: 16 }
    }, greeting)
  );
}

exports.default = HelloPlugin;
