/**
 * MOVABLE MODAL WITH MINIMIZE FUNCTIONALITY
 * Created September 3, 2025 @ 10:58 AM
 *
 * var elementID = new Moval("#moval-element"); INITIALIZE MOVAL CLASS
 * elementID.open({ width: "500px" });
 *
 * Requirement: Jquery, Bootstrap4
 * Version: 1.0.0
 *
 * Created by: RHEN HEART GATERA
 */
class Moval {
  // static arrays to track instances
  static openInstances = [];
  static minimizedInstances = [];
  static baseZ = 1000;

  constructor(selector) {
    this.$modal = $(selector);
    this.$header = this.$modal.find(".moval-header");
    this.$closeBtn = this.$modal.find(".close-btn");
    this.$minBtn = this.$modal.find(".min-btn");

    this.dragging = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.minimized = false;
    this.manualPosition = null; // { left: "100px", top: "100px" } if user dragged
    this.widthWhenOpen = null;

    this.initDrag();
    this.$closeBtn.on("click", (e) => {
      e.stopPropagation();
      this.close();
    });
    this.$minBtn.on("click", (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });

    // clicking a minimized modal (except on action buttons) restores it
    this.$modal.on("click", (e) => {
      if (this.minimized && !$(e.target).closest(".min-btn, .close-btn").length) {
        this.toggleMinimize();
      }
    });
  }

  // open: adds instance to openInstances and re-layouts
  open({ width = "500px" } = {}) {
    const headerColor = this.$header.data("header-color") || "#333";
    this.$header.css("background-color", headerColor);
    // remove from any lists to avoid duplicates
    Moval.removeFromArrays(this);

    // store preferred width for restore
    this.widthWhenOpen = width;

    Moval.openInstances.push(this);
    this.minimized = false;
    this.$modal.find(".moval-content").show();
    this.$modal.fadeIn(120);

    Moval.layoutOpen();
    Moval.layoutMinimized(); // ensure minimized stack stays valid
  }

  // close: removes from arrays and re-layouts
  close() {
    this.$modal.fadeOut(120, () => {
      // reset visible content and flags
      this.$modal.find(".moval-content").show();
      this.minimized = false;

      Moval.removeFromArrays(this);
      Moval.layoutOpen();
      Moval.layoutMinimized();
    });
  }

  // minimize / restore toggle
  toggleMinimize() {
    if (!this.minimized) {
      // Minimize: move from open -> minimized
      Moval.removeFromArrays(this);
      Moval.minimizedInstances.push(this);

      // hide content, mark minimized
      this.$modal.find(".moval-content").hide();
      this.minimized = true;

      Moval.layoutOpen();
      Moval.layoutMinimized();
    } else {
      // Restore: move from minimized -> open
      Moval.removeFromArrays(this);
      Moval.openInstances.push(this);

      // show content, mark not minimized
      this.$modal.find(".moval-content").show();
      this.minimized = false;

      Moval.layoutOpen();
      Moval.layoutMinimized();
    }
  }

  // DRAGGING: preserves manualPosition if user moves modal by dragging
  initDrag() {
    this.$header.on("mousedown", (e) => {
      // ignore clicks on action buttons
      if ($(e.target).is(".close-btn, .min-btn")) return;
      if (this.minimized) return; // don't drag when minimized

      this.dragging = true;
      const rect = this.$modal[0].getBoundingClientRect();

      // fix current position so mouse move manipulates absolute coordinates
      this.$modal.css({
        top: rect.top + "px",
        left: rect.left + "px",
        transform: "none",
      });

      this.offsetX = e.clientX - rect.left;
      this.offsetY = e.clientY - rect.top;
      this.$header.addClass("dragging");
      e.preventDefault();
    });

    $(document).on("mousemove.moval", (e) => {
      if (!this.dragging) return;
      let newLeft = e.clientX - this.offsetX;
      let newTop = e.clientY - this.offsetY;

      const modalWidth = this.$modal.outerWidth();
      const headerHeight = this.$header.outerHeight();
      const winWidth = $(window).width();
      const winHeight = $(window).height();

      newLeft = Math.max(0, Math.min(newLeft, winWidth - modalWidth));
      newTop = Math.max(0, Math.min(newTop, winHeight - headerHeight));

      this.$modal.css({ left: newLeft + "px", top: newTop + "px" });
    });

    $(document).on("mouseup.moval", () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.$header.removeClass("dragging");

      // remember manual position so layoutOpen won't override it
      const left = this.$modal.css("left");
      const top = this.$modal.css("top");
      this.manualPosition = { left, top };
      // re-layout so stacking z-index/order remains consistent
      Moval.layoutOpen();
      Moval.layoutMinimized();
    });
  }

  /* ---------- Static helpers and layouters ---------- */

  static removeFromArrays(instance) {
    let idx = Moval.openInstances.indexOf(instance);
    if (idx !== -1) Moval.openInstances.splice(idx, 1);
    idx = Moval.minimizedInstances.indexOf(instance);
    if (idx !== -1) Moval.minimizedInstances.splice(idx, 1);
  }

  // position open modals in a centered stack; respect manualPosition if set
  static layoutOpen() {
    const offsetStep = 30;
    for (let i = 0; i < Moval.openInstances.length; i++) {
      const inst = Moval.openInstances[i];
      // if user dragged and set manualPosition, keep that
      if (inst.manualPosition) {
        inst.$modal.css({
          top: inst.manualPosition.top,
          left: inst.manualPosition.left,
          transform: "none",
          right: "auto",
          bottom: "auto",
          zIndex: Moval.baseZ + 10 + i,
          width: inst.widthWhenOpen || inst.$modal.css("width"),
          height: "auto",
        });
      } else {
        const offset = i * offsetStep;
        inst.$modal.css({
          top: `calc(50% + ${offset}px)`,
          left: `calc(50% + ${offset}px)`,
          transform: "translate(-50%, -50%)",
          right: "auto",
          bottom: "auto",
          zIndex: Moval.baseZ + 10 + i,
          width: inst.widthWhenOpen || inst.$modal.css("width"),
          height: "auto",
        });
      }
      inst.$modal.find(".moval-content").show();
      inst.minimized = false;
    }
  }

  // layout minimized modals starting from bottom-right, moving left
  static layoutMinimized() {
    const startRight = 10;
    const gap = 10;
    const miniWidth = 250;
    const miniHeight = 40;

    for (let i = 0; i < Moval.minimizedInstances.length; i++) {
      const inst = Moval.minimizedInstances[i];
      inst.$modal.css({
        top: "auto",
        left: "auto",
        right: `${startRight + i * (miniWidth + gap)}px`,
        bottom: `${10}px`,
        width: `${miniWidth}px`,
        height: `${miniHeight}px`,
        transform: "none",
        zIndex: Moval.baseZ + 2000 + i,
      });
      inst.$modal.find(".moval-content").hide();
      inst.minimized = true;
    }
  }
}
