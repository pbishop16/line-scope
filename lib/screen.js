/*
 * Start a new screen
 *
 */
function newScreen(service) {
  const name = service.name;

  shell.exec(`screen -s ${name}`)
}


/*
 * Destroy all screens
 *
 */
 function destroyAllScreens() {
   shell.exec('screen -X quit')
 }
