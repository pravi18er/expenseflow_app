/* 
   ExpenseFlow Main Application Bootstrapper (app.js)
   Ties storage, UI, charts together and handles system-level listeners.
*/

document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Bootstrapper
    window.ui.applySystemTheme();

    // 2. Add system color scheme listener for automatic themes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (window.store.settings.theme === 'auto') {
            window.ui.applySystemTheme();
        }
    });

    // 3. Switch to initial home view
    window.ui.switchToView('home');

    // 4. Log successful startup
    console.log('ExpenseFlow Bootstrapped Successfully!');
});
