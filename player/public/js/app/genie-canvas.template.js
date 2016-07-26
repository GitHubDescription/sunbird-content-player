angular.module('genie-canvas.template',[])
.controller('ContentHomeCtrl', function($scope, $rootScope, $http, $cordovaFile, $cordovaToast, $ionicPopover, $state, ContentService, $stateParams) {
    $rootScope.showMessage = false;
    $rootScope.pageId = "coverpage";
    $rootScope.content;
    $scope.showPage = true;
    $scope.playContent = function(content) {
        $scope.showPage = false;
        $state.go('playContent', {
            'itemId': content.identifier
        });
        jQuery('#loadingText').text(content.name);
        jQuery('#loadingText1').text(content.name);
        jQuery("#progressBar").width(0);
        jQuery('#loading').show();
        startProgressBar(40, 0.6);

    };

    $scope.getContentMetadata = function(content) {
        jQuery('#loading').hide();
        ContentService.getContent(content)
        .then(function(data) {
           $scope.setContentMetadata(data);
        })
        .catch(function(err) {
            console.info("contentNotAvailable : ", err);
            contentNotAvailable();
        });
    }

    $scope.setContentMetadata = function(data){
        GlobalContext.currentContentId = data.identifier;
        GlobalContext.currentContentMimeType = data.mimeType;
        if(_.isUndefined(data.localData)){
            data.localData = data;
        }else{
            data =data.localData;
        }
        data.status = "ready";
        $scope.$apply(function() {
            $scope.item = data;
            $rootScope.content = data;
        });
        // This is used by ContentCtrl.
        //$rootScope.stories = [data];
        var identifier = (data && data.identifier) ? data.identifier : null;
        var version = (data && data.pkgVersion) ? data.pkgVersion : "1";
        TelemetryService.start(identifier, version);
        TelemetryService.interact("TOUCH", data.identifier, "TOUCH", { stageId: "ContentApp-Title", subtype: "ContentID"});
    }

    $scope.init = function(){
        $scope.showPage = true;
        if (GlobalContext.config.appInfo && GlobalContext.config.appInfo.identifier) {
            if( (webview == "true")){
                if(content.metadata && (content.metadata.mimeType != COLLECTION_MIMETYPE)){
                    jQuery('#loading').hide();
                    //For JSON and Direct contentID
                    $scope.setContentMetadata(content.metadata);
                }else{
                    //For collections
                    $scope.getContentMetadata($stateParams.contentId);
                }
            }else{
                //For mobile
                $scope.getContentMetadata($stateParams.contentId);
            }
        } else {
            alert('Sorry. Could not find the content.');
            startApp();
        }
        
    }
    
    $rootScope.$on('show-message', function(event, data) {
        if (data.message && data.message != '') {
            $rootScope.showMessage = true;
            $rootScope.message = data.message;
            $rootScope.$apply();
        }
        if (data.timeout) {
            setTimeout(function() {
                $rootScope.showMessage = false;
                $rootScope.$apply();
                if (data.callback) {
                    data.callback();
                }
            }, data.timeout);
        }
    });

    $rootScope.$on('process-complete', function(event, result) {
        $scope.$apply(function() {
            $scope.item = result.data;
        });
    });

    setTimeout(function(){
        $scope.init();
    }, 0);
})
.controller('EndPageCtrl', function($scope, $rootScope, $state, ContentService, $stateParams) {
    $scope.showNextContent = true;
    $rootScope.pageId = "endpage";
    $scope.creditsBody = '<div class="credit-popup"><img ng-src="{{icons.popup.credit_popup}}" style="width:100%;" /><div class="popup-body"><div class="credit-body-icon-font"><table style="width:100%; table-layout: fixed;"><tr ng-hide="content.imageCredits==null"><td class="credits-title">Image</td><td class="credits-data">{{content.imageCredits}}</td></tr><tr ng-hide="content.voiceCredits==null"><td class="credits-title">Voice</td><td class="credits-data">{{content.voiceCredits}}</td></tr><tr ng-hide="content.soundCredits==null"><td class="credits-title">Sound</td><td class="credits-data">{{content.soundCredits}}</td></tr></table><div class="content-noCredits" ng-show="content.imageCredits == null && content.voiceCredits == null && content.soundCredits == null">There is no credits available</div></div></div><a class="popup-close" href="javascript:void(0)" ng-click="hidePopup()"><img ng-src="{{icons.popup_close.close_icon}}" style="width:100%; left:70%;"/></a></div>';
    //$rootScope.content = {};

    $scope.arrayToString = function(array) {
        return (_.isString(array)) ? array : (!_.isEmpty(array) && _.isArray(array)) ? array.join(", "): "";   
    };

    $scope.setCredits = function(key) {
        if (content[key]) {
            content[key] = $scope.arrayToString(content[key]);
        } else {
            content[key] = null;
        }
    };
    var content = $rootScope.content;
    console.log(" Content metadata : ", content);
    if(!GlobalContext.previousContentId){
        $scope.showNextContent = false;
    }

    $scope.setCredits('imageCredits');
    $scope.setCredits('soundCredits');
    $scope.setCredits('voiceCredits');

    var creditsPopup = angular.element(jQuery("popup[id='creditsPopup']"));
    creditsPopup.trigger("popupUpdate", {"content": content});
    setTimeout(function() {
        $rootScope.$apply();
    }, 1000);

    TelemetryService.interact("TOUCH", $stateParams.contentId, "TOUCH", { stageId: "ContnetApp-EndScreen", subtype: "ContentID"});
    
    $scope.showCredits = function(key) {
        if (content.imageCredits == null && content.voiceCredits == null && content.soundCredits == null) {
            console.warn("No metadata imageCredits,voiceCredites and soundCredits");
        }
        jQuery("#creditsPopup").show();
        TelemetryService.interact("TOUCH", "gc_credit", "TOUCH", {
            stageId: "ContnetApp-CreditsScreen",
            subtype: "ContentID"
        });
    }
    $scope.playNextContent = function() {
        var id = collectionChildrenIds.pop();
        if(Renderer.running)
            Renderer.cleanUp();
        if(id) {
            ContentService.getContent(id)
            .then(function(content) {
                if (COLLECTION_MIMETYPE == content.mimeType) {
                    $state.go('contentList', { "id": id });
                } else {
                    $state.go('showContent', {"contentId": id});
                }
            })
            .catch(function(err) {
                if(!_.isEmpty(collectionChildrenIds))
                     $scope.playNextContent();
                else {
                    console.info("contentNotAvailable : ", err);
                    contentNotAvailable();
                }
            });
        } else {
            $state.go('contentList', { "id": GlobalContext.previousContentId });
        }
    }

    $scope.restartContent = function() {
        window.history.back();
        var gameId = TelemetryService.getGameId();
        var version = TelemetryService.getGameVer();;
        var instance = this;
        setTimeout(function() {
            if (gameId && version) {
                TelemetryService.start(gameId, version);
            }
        }, 500);
    }

     $scope.playRelatedContent = function(content) {
        console.log("content : ", content);
        if(content.isAvailable) {
            ContentService.getContent(content.identifier)
            .then(function(content) {
                if (COLLECTION_MIMETYPE == content.mimeType) {
                    $state.go('contentList', { "id": content.identifier});
                } else {
                    $state.go('showContent', {"contentId": content.identifier});
                }
            })
        } else {
            console.log("inside into playRelatedContent else condition ( open in deep link ).............. ")
            window.open("http://www.ekstep.in/c/" + content.identifier, "_system");
            exitApp();
        }
    }

    $scope.renderRelatedContent = function(id) {
        if(GlobalContext.config.appInfo.mimeType != COLLECTION_MIMETYPE) {
            // ContentService.getRelatedContent(id)
            // .then(function(item) {
            //     console.log("item : ", item);
            //     if(!_.isEmpty(item)) {
                        // $scope.showRelatedContent = true;
            //         item.unshift(content);
            //         $scope.$apply(function() {
            //             $rootScope.relatedContent = item;
            //         });
            //     } else {
            //         // TODO : Hide Related Content Ui Element and Show restart icon for current game.
                        // $scope.showRelatedContent = false;
            //     }
            // })

            // This for testing purpose. 
            ContentService.getContentList()
            .then(function(item) {
                console.log("item : ", item);
                if(!_.isEmpty(item)) {
                    $scope.showRelatedContent = true;
                    item.unshift(content);
                    $scope.$apply(function() {
                        $rootScope.relatedContent = item;
                    });
                } else {
                    // TODO : Hide Related Content Ui Element and Show restart icon for current game.
                    $scope.showRelatedContent = false;
                }
            })
        } else {
            if(rootScope.stories.length == 1) {
                // TODO : Hide Related Content UI Element and Show restart icon for current game.
                $scope.showRelatedContent = false;
             } else {
                $scope.showRelatedContent = true;
                var swapIndex = undefined,
                tempMetadata = undefined;
                collectionContent = $rootScope.stories;
    
                // Swaping the current played content metadata to the top of Array.
                for(var i = 0; i < collectionContent.length; i++) {
                    if(collectionContent[i].identifier == $stateParams.contentId) {
                        swapIndex = i;
                        break;
                    }
                }
                tempMetadata = collectionContent[swapIndex];
                collectionContent[swapIndex] = collectionContent[0];
                collectionContent[0] = tempMetadata;
                console.log("collectionContent : ", collectionContent);
                $scope.$apply(function() {
                    $rootScope.relatedContent = collectionContent;
                });
             }
        }
    }

    $scope.setTotalTimeSpent = function() {
        var totalTime = Math.round((new Date().getTime() - (TelemetryService.instance._end[TelemetryService.instance._end.length -1 ].startTime))/1000);
        var mm = Math.round(totalTime/60);
        var ss = Math.round(totalTime%60);
        $scope.totalTimeSpent = (mm > 9 ? mm : ("0" + mm))  + ":" + (ss > 9 ? ss : ("0" + ss));
        console.log("totalTime : ", $scope.totalTimeSpent);

    }

    $scope.getTotalScore = function(id) {
        // uncomment when genieservice will give getContentTotalScore Api to get total score, obtained by user.
        // ContentService.getLearnerAssessment(GlobalContext.user.uid, id);
        // .then(function(score){
        //     if(score) {
        //         $scope.showScore = true;
        //         $scope.totalScore = score;
        //     } else {
        //         $scope.showScore = false
        //         jQuery('#timeSpentArea').attr('margin-left', 23);
        //     }
        // })

        $scope.showScore = false
        jQuery('#timeSpentArea').css('margin-left', 23 + '%');
    }

    setTimeout(function() {
        $scope.renderRelatedContent($stateParams.contentId);
         $scope.setTotalTimeSpent();
         $scope.getTotalScore();
    }, 0);

});
