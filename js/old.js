function are_friends(situa, id1, id2){
    return situa.friends[id1].has(id2)
        && situa.friends[id2].has(id1);
  }
  function fun(){
    var s = "str";
  console.log(typeof(s));
  }
  
  function make_friends(situa, id1, id2){
    situa.friends[id1].add(id2);
    situa.friends[id2].add(id1);
  }
  
  function remove_friends(situa, id1, id2){
    situa.friends[id1].delete(id2);
    situa.friends[id2].delete(id1);
  }
  
  function get_active_members(){
    var members_with_id_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Members_With_ID");
    var coffee_club_members = members_with_id_sheet.getRange(1, 1, members_with_id_sheet.getLastRow(), members_with_id_sheet.getLastColumn())
                                                   .getValues()
                                                   .filter(function(member){return typeof(member[0]) == "number"});
    var active_coffee_club_members = coffee_club_members.filter(function(member){
      return member[4] == "Iscriverti";
    })
    return active_coffee_club_members;
  }
  
  function get_friends(){
    var friends_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Friends");
    return friends_sheet.getRange(1, 1, friends_sheet.getLastRow(), friends_sheet.getLastColumn())
                        .getValues()
                        .filter(function(row){return typeof(row[1]) == "number"});
  }
  
  function active_members_to_ids(active_members){
    return active_members.map(function(member){return member[0];});
  }
  
  function friends_list_to_matrix(friends_list, active_members_id){
    var friends_matrix = [];
    var max_active_member_id = Math.max(...active_members_id);
    
    for(var i = 0; i<=max_active_member_id; i++){
      friends_matrix.push(new Set());
    }
    friends_list.forEach(function(element){
      friends_matrix[element[1]].add(element[2]);
      friends_matrix[element[2]].add(element[1]);
      if(typeof(element[3]) == "number"){
        friends_matrix[element[1]].add(element[3]);
        friends_matrix[element[3]].add(element[1]);
        friends_matrix[element[2]].add(element[3]);
        friends_matrix[element[3]].add(element[2]);
      }
    });
    console.log("finished to make friends_matrix");
    return friends_matrix;
  }
  
  function handle_single_active_unpaired_member(curr_situa, solutions){
    if(curr_situa.active_unpaired_members.size != 1){
      console.log("[ERROR] Illegal argument exception.\n");
      throw new Error("Illegal argument exception.");
    }
  
    const curr_member_to_pair = curr_situa.active_unpaired_members.values().next().value;
    curr_situa.curr_solution.forEach(function(group){
      if(solutions.length == 0
      && !are_friends(curr_situa, curr_member_to_pair, group[0])
      && !are_friends(curr_situa, curr_member_to_pair, group[1])){
        group.push(curr_member_to_pair);
        solutions.push([...curr_situa.curr_solution]);
        //group.pop();//it must stay commented out since in javascript matrix is not copied. can't go on with my search of other solutions
      }
    });
  }
  
  function get_members_to_pair_with(curr_situa, curr_member_to_pair){
    var possible_members_to_pair = new Set(curr_situa.active_unpaired_members);
    possible_members_to_pair.forEach(function(pair_candidate){
      if(are_friends(curr_situa, curr_member_to_pair, pair_candidate)){
         possible_members_to_pair.delete(pair_candidate);
      }
    });
    return possible_members_to_pair;
  }
  
  function find_new_groups(curr_situa, solutions){
    if(solutions.length >= 1){
      //console.log("max sol found");
      return;
    }
    if(curr_situa.active_unpaired_members.size == 0){
      solutions.push([...curr_situa.curr_solution]);
      return;
    }
    if(curr_situa.active_unpaired_members.size == 1){
      console.log("[WARNING] experimental implementation for odd number of members.");
      //TODO add implementation
      //solutions.push([...curr_situa.curr_solution]);
      handle_single_active_unpaired_member(curr_situa, solutions);
      return;
    }
    
    const curr_member_to_pair = curr_situa.active_unpaired_members.values().next().value;
    curr_situa.active_unpaired_members.delete(curr_member_to_pair);
    
    get_members_to_pair_with(curr_situa, curr_member_to_pair).forEach(function(pair_candidate){
      make_friends(curr_situa, curr_member_to_pair, pair_candidate);
      make_friends(curr_situa, curr_member_to_pair, pair_candidate);
      curr_situa.active_unpaired_members.delete(pair_candidate);
      curr_situa.curr_solution.push([curr_member_to_pair, pair_candidate]);
      find_new_groups(curr_situa, solutions);
      curr_situa.curr_solution.pop();
      curr_situa.active_unpaired_members.add(pair_candidate);
      remove_friends(curr_situa, curr_member_to_pair, pair_candidate);
    });  
    curr_situa.active_unpaired_members.add(curr_member_to_pair);
  }
  
  function have_coffee_club(){
    var active_members = get_active_members();
    var active_members_id = active_members_to_ids(active_members);
  
    var friends_list = get_friends();
    var friends_matrix = friends_list_to_matrix(friends_list, active_members_id);
  
    var Situa = make_struct("curr_solution active_unpaired_members friends");
    var curr_situa = new Situa([], new Set(active_members_id), friends_matrix);
    var new_groups_solutions = [];
    find_new_groups(curr_situa, new_groups_solutions);
    var new_groups = new_groups_solutions[0];
    //write_new_groups_to_friends_sheet();
    debug(new_groups);
  }
  
  function debug_situa(situa){
    situa.active_unpaired_members.forEach(function(el){console.log(el);})
    for (var i = 0; i<=42; i++){
      console.log('' + i + situa.active_unpaired_members.has(i));
    }
  }
  
  function debug(object){
    var debug_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Debug");
    object.forEach(function(element){debug_sheet.appendRow(element);})  
  }
  
  function make_struct(names) {
    var names = names.split(' ');
    var count = names.length;
    function constructor() {
      for (var i = 0; i < count; i++) {
        this[names[i]] = arguments[i];
      }
    }
    return constructor;
  }