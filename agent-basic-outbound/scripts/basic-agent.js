NavController = function($scope, $uibModal, Agent) {
  $scope.signOut = function() {
    console.log('sign out');
    $uibModal.open({
      templateUrl: '/host/webresources/agent/template/signout-modal',
      controller: 'SignoutController',
      resolve: {
      }
    }).result.then(function (logoutReason) {
      // MODAL OK
      Agent.logout(logoutReason.reasonCode);
      $cookies.remove('realise-agent');
      $state.go('login');      
    }, function () {
      // CANCEL MODAL           
    });    
  }
};

/**
 * STATUS CONTROLLER
 * Injects root scope with real-time status data from web sockets
 */
StatusController = function ($scope, $state, Agent, AgentStatusWebSocketService, PhoneStatusWebSocketService, $cookies, $rootScope, $interval) {

  console.log('status controller start');

  // this fast call validates each page landing and redirects to login if no longer authorized.
  Agent.getSystemInfo().then(function (response) {
    $rootScope.systemVersion = response.version;
    $rootScope.hostName = response.hostName;
  }, function () {
    $cookies.remove('realise-agent');
    $state.go('login');
  });

  $scope.handleAgentUpdate = function (status) {
    $rootScope.hostTime = AgentStatusWebSocketService.getHostTime();
    $rootScope.agentStatus = status.agentStatus;
    console.log('agent status update ' + JSON.stringify($rootScope.agentStatus));
    if($scope.agentStatus) {
      if($scope.agentStatus.agentState === 'WORKING') {
        // jump to contact page
        $state.go('contact');
      }
    }
    if (!$scope.selectedPhone) {
      Agent.getPhones().then(function (phoneController) {
        $rootScope.phoneController = phoneController;
        // select the phone that's in the agent status
        if ($rootScope.agentStatus) {
          angular.forEach($scope.phoneController.phones, function (phone) {
            if (phone.address === $scope.agentStatus.address) {
              $scope.selectedPhone = phone;
              PhoneStatusWebSocketService.updatePhoneAddress(phone.address);
            }
          });
        }
      });
    }
    if (!$scope.$$phase) {
      $scope.$apply();
    }
  };

  $scope.handleCallPartyUpdate = function (status) {
    $rootScope.hostTime = AgentStatusWebSocketService.getHostTime();
    $rootScope.callPartyStatus = status.callPartyStatus;
    console.log('call party status update ' + JSON.stringify($scope.callPartyStatus));
    if (!$scope.$$phase) {
      $scope.$apply();
    }
  };

  $scope.intervalTimer = function () {
    $rootScope.hostTime = AgentStatusWebSocketService.getHostTime();
    if ($rootScope.agentStatus) {
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
  if (!$rootScope.statusStarted) {
    AgentStatusWebSocketService.openStatusWebSocket($scope.handleAgentUpdate, $scope.handleCallPartyUpdate);
    $rootScope.statusStarted = true;
  }

}

/**
 * HOME PAGE CONTROLLER
 * This page allows agent to select the phone station, seize the phone and then place a manual call or go into predictive call pool.
 */
HomeController = function ($scope, $state, Agent, AgentStatusWebSocketService, PhoneStatusWebSocketService, $cookies, $interval, $rootScope) {

  $scope.isNavCollapsed = true;
  $scope.isCollapsed = false;
  $scope.isCollapsedHorizontal = false;

  $scope.navigateReadyPage = function () {
    $state.go('ready');
  };

  $scope.connectBridge = function (address) {
    console.log('connect bridge ' + $rootScope.deviceAddress);
    Agent.bridgeConnect($rootScope.deviceAddress);
  };

  $scope.disconnectBridge = function () {
    console.log('release bridge');
    Agent.bridgeRelease();
  };

  $scope.updatePhoneAddress = function (phone) {
    console.log('updated selected phone ' + JSON.stringify(phone));
    PhoneStatusWebSocketService.updatePhoneAddress(phone.address);
    $rootScope.deviceAddress = phone.address;
    $rootScope.deviceState = undefined;
  };

  $scope.agentPhoneConnected = function () {
    if (!$rootScope.callPartyStatus) {
      return false;
    }
    if (!$rootScope.agentStatus) {
      return false;
    }
    return (($rootScope.deviceState === 'CONNECTED') && ($rootScope.deviceAddress === $rootScope.callPartyStatus.dn));
  };

  $scope.goToReadyPage = function () {
    // $interval.cancel($scope.intervalTimerPromise);
    // $interval.cancel($scope.phoneStatusTimerPromise);
    $state.go('ready');
  };

  $scope.handleDeviceUpdate = function (deviceAddress, deviceState) {
    console.log('device status update ' + deviceAddress + ':' + deviceState);
    $rootScope.deviceAddress = deviceAddress;
    $rootScope.deviceState = deviceState;
    if (!$scope.$$phase) {
      $scope.$apply();
    }
  };

  $scope.phoneStatusTimer = function () {
    Agent.getPhones().then(function (phoneController) {
      console.log('phone controller update ' + JSON.stringify(phoneController));
      $scope.phoneController = phoneController;
    });
  };

  $scope.phoneStatusTimerPromise = $interval($scope.phoneStatusTimer, 10000);

  PhoneStatusWebSocketService.openStatusWebSocket($scope.handleDeviceUpdate);

};

/**
 * READY/UNREADY PAGE CONTROLLER
 * Agent can change readiness state and go back to home page.
 */
ReadyController = function ($scope, $state, Agent, AgentStatusWebSocketService, $cookies, $interval) {
  console.log('ReadyController started');

  $scope.agentReady = function () {
    Agent.ready();
  };

  $scope.agentUnready = function () {
    Agent.unready();
  };
};

/**
 * CONTACT PAGE CONTROLLER
 * We jump to this page when the agent transitions to a working state..
 */
ContactController = function ($scope, $state, Agent, AgentStatusWebSocketService, $cookies) {
  console.log('ContactController started');
  Agent.getAgentContext().then(function(context) {
    console.log('get agent context ' + JSON.stringify(context));
    $scope.agentContext = context;
  }, function(error) {
    console.error('get agent context error ' + JSON.stringify(error));
  });
};

/**
 * SIGNOUT CONTROLLER
 * Agent sign out with a logout reason code.
 */
SignoutController = function ($scope, $state, Agent, $uibModalInstance) {
  console.log('SignoutController started');
  Agent.getLogoutReasons().then(function(result) {
    $scope.logoutReasons = result;
  });
  $scope.ok = function () {
    $uibModalInstance.close($scope.logoutReason);
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss();
  };
};



/**
 * ROUTES
 * This is where controllers and page templates are specified.
 */

(function () {
  return {
    controllers: {
      // controllers are defined in this list
      'StatusController': StatusController,
      'NavController': NavController,
      'SignoutController': SignoutController,
      'HomeController': HomeController,
      'ReadyController': ReadyController,
      'ContactController': ContactController
    },
    states: {
      // routes are defined in this list
      'home': {
        url: '/home',
        templateUrl: '/host/webresources/agent/template/home.html',
        controller: 'HomeController'
      },
      'ready': {
        url: '/ready',
        templateUrl: '/host/webresources/agent/template/ready.html',
        controller: 'ReadyController'
      },
      'contact': {
        url: '/contact',
        templateUrl: '/host/webresources/agent/template/contact.html',
        controller: 'ContactController'
      }
    }
  };
})();
