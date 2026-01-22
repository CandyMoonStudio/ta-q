export class Drawer {
  public toggle() {
    const body = document.body;
    if (body.classList.contains('drawer-open')) {
      body.classList.remove('drawer-open');
    } else {
      body.classList.add('drawer-open');
    }
  }

  public switchTab(tab: string) {
    document.querySelectorAll('.drawer-tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.drawer-content').forEach((c) => c.classList.remove('active'));

    const btn = document.querySelector(`.drawer-tab-btn[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');

    const content = document.getElementById('content-' + tab);
    if (content) content.classList.add('active');
  }

  public openEdit(id: string | number) {
    // Hide all contents
    document.querySelectorAll('.drawer-content').forEach((c) => c.classList.remove('active'));
    const content = document.getElementById('content-edit');
    if (content) content.classList.add('active');

    // Open Drawer
    document.body.classList.add('drawer-open');
  }
}
