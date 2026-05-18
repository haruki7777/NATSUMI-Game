(function () {
  function ready(fn) {
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn();
  }

  ready(() => {
    const body = document.body;
    const menu = document.querySelector("#drawerMenu");
    const openBtn = document.querySelector("#menuToggle");
    const closeBtn = document.querySelector("#menuClose");
    const backdrop = document.querySelector("#menuBackdrop");
    if (!menu || !openBtn || !backdrop) return;

    const open = () => {
      menu.classList.add("open");
      backdrop.classList.add("open");
      body.classList.add("menu-open");
      openBtn.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
    };
    const close = () => {
      menu.classList.remove("open");
      backdrop.classList.remove("open");
      body.classList.remove("menu-open");
      openBtn.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
    };
    const activateView = (name) => {
      if (!name) return;
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
      document.querySelector(`#${name}View`)?.classList.add("active-view");
      document.querySelectorAll(".nav-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.view === name);
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      close();
    };

    openBtn.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    backdrop.addEventListener("click", close);
    document.querySelectorAll(".nav-btn").forEach((btn) => btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activateView(btn.dataset.view);
    }));
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  });
})();
