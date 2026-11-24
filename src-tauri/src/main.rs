// Esconde a janela de console extra no Windows (versão final).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar o GAM Analytics");
}
