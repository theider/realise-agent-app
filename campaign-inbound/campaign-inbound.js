/* global Realise */
function onInboundCall(context) {
  var logger = Realise.logger;
  var contact = context.contact;
  logger.info('inbound call contact ID ' + contact.id + ' phone:[' + contact.address + ']');
  return 'ACCEPT';
}

function processContact(context) {
  var voice = Realise.voice;
  var logger = Realise.logger;
  var contact = context.contact;
  var party = context.party;
  logger.info('process inbound call contact ID ' + contact.id + ' phone:[' + contact.address + ']');
  logger.debug('start playing 3 seconds of 440 tone');
  voice.playTone(party, 660, 4000, 500);
  logger.debug('done playing tone');
  voice.pause(500);
  voice.playFile(party, 'hello');
  voice.playTone(party, 440, 4000, 500);
  voice.pause(100);
  voice.playTone(party, 220, 4000, 500);
  voice.pause(500);
  logger.info('call completed');
}
