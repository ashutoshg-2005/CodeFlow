export function Header() {
  return (
    <box alignItems="center" justifyContent="center">
      <box flexDirection="row" justifyContent="center" gap = {0.5} alignItems="center">
        <ascii-font font="tiny" text="CODE" color="grey" />
        <ascii-font font="tiny" text="FLOW" color="white" />
      </box>
    </box>
  );
};