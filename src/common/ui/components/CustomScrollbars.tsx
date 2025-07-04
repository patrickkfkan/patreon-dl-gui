import Scrollbars from "react-custom-scrollbars-4";

function CustomScrollbars({ children }: { children: React.ReactNode }) {
  return (
    <Scrollbars
      className="scrollbars"
      autoHide
      hideTracksWhenNotNeeded
      renderTrackHorizontal={(props) => (
        <div {...props} className="track-horizontal" />
      )}
      renderTrackVertical={(props) => (
        <div {...props} className="track-vertical" />
      )}
      renderThumbHorizontal={(props) => (
        <div {...props} className="thumb-horizontal" />
      )}
      renderThumbVertical={(props) => (
        <div {...props} className="thumb-vertical" />
      )}
      renderView={(props) => <div {...props} className="view" />}
    >
      {children}
    </Scrollbars>
  );
}

export default CustomScrollbars;
