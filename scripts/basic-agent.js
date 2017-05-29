HomeController = function ($scope, $state, Agent, AgentStatusWebSocketService, PhoneStatusWebSocketService, $cookies, $interval) {

  Agent.getSystemInfo().then(function(info) {
    $scope.systemVersion = info.version;
    $scope.hostName = info.hostName;
  }, function() {
    $cookies.remove('realise-agent');
    $state.go('login');
  });

  $scope.connectBridge = function(address) {
    console.log('connect bridge ' + $scope.selectedPhone.address);
    Agent.bridgeConnect($scope.selectedPhone.address);
  };

  $scope.disconnectBridge = function() {
    console.log('release bridge');
    Agent.bridgeRelease();      
  };

  $scope.updatePhoneAddress = function(phone) {
    console.log('updated selected phone ' + JSON.stringify(phone));
    PhoneStatusWebSocketService.updatePhoneAddress(phone.address);
    $scope.deviceAddress = phone.address;
    $scope.deviceState = undefined;    
  };

  $scope.handleAgentUpdate = function(status) {
    $scope.hostTime = AgentStatusWebSocketService.getHostTime();
    $scope.agentStatus = status.agentStatus;
    console.log('agent status update ' + JSON.stringify($scope.agentStatus));
    if(!$scope.selectedPhone) {
      Agent.getPhones().then(function(phoneController) {
        $scope.phoneController = phoneController;
        // select the phone that's in the agent status
        if($scope.agentStatus) {
          angular.forEach($scope.phoneController.phones, function(phone) {
            if(phone.address === $scope.agentStatus.address) {
              $scope.selectedPhone = phone;
              PhoneStatusWebSocketService.updatePhoneAddress(phone.address);
            }
          });
        }
      });
    }
  };

  $scope.handleDeviceUpdate = function(deviceAddress, deviceState) {
    console.log('device status update ' + deviceAddress + ':' + deviceState);
    $scope.deviceAddress = deviceAddress;
    $scope.deviceState = deviceState;    
    $scope.$apply();
  }

  $scope.agentPhoneConnected = function() {
    return (($scope.callPartyStatus.deviceState === 'CONNECTED') && ($scope.agentStatus.address === $scope.callPartyStatus.dn));
  };

  $scope.handleCallPartyUpdate = function(status) {
    $scope.hostTime = AgentStatusWebSocketService.getHostTime();    
    $scope.callPartyStatus = status.callPartyStatus;
    console.log('call party status update ' + JSON.stringify($scope.callPartyStatus));    
    $scope.apply();
  };

  PhoneStatusWebSocketService.openStatusWebSocket($scope.handleDeviceUpdate);
  AgentStatusWebSocketService.openStatusWebSocket($scope.handleAgentUpdate, $scope.handleCallPartyUpdate);

  console.log('HomeController started!');
  $scope.goToReadyPage = function() {
    $state.go('ready');
  };

  $scope.phoneStatusTimer = function() {
    Agent.getPhones().then(function(phoneController) {
      $scope.phoneController = phoneController;
    });
  };

  $scope.intervalTimer = function () {
    $scope.hostTime = AgentStatusWebSocketService.getHostTime();
    if ($scope.agentStatus) {
      if($scope.agentStatus.agentState !== 'WORKING') {
        $interval.cancel($scope.intervalTimerPromise);
        $interval.cancel($scope.phoneStatusTimerPromise);
//        $state.go('dashboard')
      }
      // get the HOST TIME when state changed.
      var dateWhenChanged = new Date($scope.agentStatus.whenStateChanged);
      // ms in state
      var timeInStateMs = $scope.hostTime.getTime() - dateWhenChanged.getTime();
      if (timeInStateMs < 0) {
        timeInStateMs = 0;
      }
      $scope.agentDuration = timeInStateMs;
      $scope.agentStateText = $scope.agentStatus.agentState;
    }

  };
  
  $scope.intervalTimerPromise = $interval($scope.intervalTimer, 750);
  $scope.phoneStatusTimerPromise = $interval($scope.phoneStatusTimer, 10000);


};

ReadyController = function ($scope) {
  console.log('ReadyController started!');
  $scope.readyPageMessage = 'this is from the ready controller';
};

(function () {
  return {
    controllers: {
      // controllers are defined in this list
      'HomeController': HomeController,
      'ReadyController': ReadyController
    },
    states: {
      // routes are defined in this list
      'home': {
        url: '/home',
        templateUrl: '/host/webresources/agent/template/home',
        controller: 'HomeController'
      },
      'ready': {
        url: '/ready',
        templateUrl: '/host/webresources/agent/template/ready',
        controller: 'ReadyController'
      }
    }
  };
})();
