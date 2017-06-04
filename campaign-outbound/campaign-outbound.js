/* global Logger, Voice, Contact */
function processContact(contact) {
  Logger.info('started new process ' + contact.id);
  var contactParty = contact.contactParty;
  var disposition = contact.disposition;
  Logger.debug('process outbound call contact ID ' + contact.id + ' phone:[' + contact.address + '] disposition:' + disposition);
  if(disposition === 'ANSWERED') {
    Logger.info('call answered');
    Logger.debug('start playing 3 seconds of 440 tone');
    Voice.playTone(contactParty, 660, 4000, 500);
    Logger.debug('done playing tone');
    Voice.pause(200);
    Voice.playFile(contactParty, 'hello');
    // xfer to next ready agent with a max hold time of 5 seconds.
    var result = Voice.agentConnect(contact, 5000);
    if(result.success) {
      var agent = result.data;
      Logger.info('connected call to agent ' + agent.id + ":" + agent.name);      
    } else {
      if(result.error === 'no agents availble') {
        Logger.info('abandoning call');
        // 15 minute reschedule
        Contact.reschedule(contact, 15, 3);
      } else {
        Logger.error('unknown failure:' + result.error);        
      }
    }
  } else {
    // outcome will be BUSY or NOANSWER, etc
    Logger.info('called was not answered:' + disposition);
    if(disposition == 'BUSY') {
      // 8 minutes in the future
      Contact.reschedule(contact, 8, 3);
    } else if(disposition === 'NOANSWER') {
      // 2 hours in the future
      Contact.reschedule(contact, 120, 2);
    }
  }
  Logger.debug('call completed');
}
