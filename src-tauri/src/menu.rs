use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{App, Emitter};

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
  let new_project = MenuItemBuilder::new("New Project")
    .id("new_project")
    .accelerator("CmdOrCtrl+N")
    .build(app)?;

  let open_project = MenuItemBuilder::new("Open Project...")
    .id("open_project")
    .accelerator("CmdOrCtrl+O")
    .build(app)?;

  let save = MenuItemBuilder::new("Save")
    .id("save")
    .accelerator("CmdOrCtrl+S")
    .build(app)?;

  let close_project = MenuItemBuilder::new("Close Project")
    .id("close_project")
    .accelerator("CmdOrCtrl+W")
    .build(app)?;

  let file_menu = SubmenuBuilder::new(app, "File")
    .item(&new_project)
    .item(&open_project)
    .separator()
    .item(&save)
    .separator()
    .item(&close_project)
    .build()?;

  let edit_menu = SubmenuBuilder::new(app, "Edit")
    .undo()
    .redo()
    .separator()
    .cut()
    .copy()
    .paste()
    .select_all()
    .build()?;

  let menu = MenuBuilder::new(app)
    .item(&file_menu)
    .item(&edit_menu)
    .build()?;

  app.set_menu(menu)?;

  let app_handle = app.handle().clone();
  app.on_menu_event(move |_app, event| {
    let id = event.id().0.as_str();
    match id {
      "new_project" | "open_project" | "save" | "close_project" => {
        let _ = app_handle.emit("menu-action", id);
      }
      _ => {}
    }
  });

  Ok(())
}
